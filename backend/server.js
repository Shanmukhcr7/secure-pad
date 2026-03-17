const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./db');
const { upload, cloudinary } = require('./upload');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── Init: create tables if not exist ────────────────────────────────────────
async function initDB() {
    const conn = await pool.getConnection();
    const exec = (sql, params) => conn.execute(sql, params);

    try {
        await exec(`CREATE TABLE IF NOT EXISTS notes (
            note_key          VARCHAR(512) PRIMARY KEY,
            encrypted_content LONGTEXT NOT NULL,
            created_at        BIGINT NOT NULL,
            expiry_time       BIGINT DEFAULT NULL,
            one_time_view     BOOLEAN DEFAULT FALSE,
            viewed            BOOLEAN DEFAULT FALSE,
            user_id           INT DEFAULT NULL,
            note_title        VARCHAR(512) DEFAULT NULL
        )`);

        // Migration: add user_id / note_title if notes table pre-existed
        for (const [col, def] of [
            ['user_id',    'INT DEFAULT NULL'],
            ['note_title', 'VARCHAR(512) DEFAULT NULL'],
        ]) {
            try { await exec(`ALTER TABLE notes ADD COLUMN ${col} ${def}`); }
            catch (e) { if (e.errno !== 1060) throw e; }
        }

        // Migration: ensure user_id and note_title are always nullable (fix NOT NULL from earlier schemas)
        try { await exec('ALTER TABLE notes MODIFY COLUMN user_id INT DEFAULT NULL'); } catch (_) {}
        try { await exec('ALTER TABLE notes MODIFY COLUMN note_title VARCHAR(512) DEFAULT NULL'); } catch (_) {}

        await exec(`CREATE TABLE IF NOT EXISTS attachments (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            note_key     VARCHAR(512) NOT NULL,
            public_id    VARCHAR(512) NOT NULL,
            url          TEXT NOT NULL,
            filename     VARCHAR(255),
            file_type    VARCHAR(100),
            size_bytes   INT,
            uploaded_at  BIGINT NOT NULL,
            INDEX idx_note_key (note_key)
        )`);

        await exec(`CREATE TABLE IF NOT EXISTS users (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            username      VARCHAR(255) UNIQUE NOT NULL,
            email         VARCHAR(255) DEFAULT NULL,
            password_hash VARCHAR(255) DEFAULT NULL,
            created_at    BIGINT NOT NULL DEFAULT 0
        )`);

        // Migration: rename old `password` column → `password_hash` if it exists
        try {
            await exec(`ALTER TABLE users CHANGE COLUMN \`password\` password_hash VARCHAR(255) DEFAULT NULL`);
            console.log('[MIGRATE] Renamed password → password_hash');
        } catch (e) {
            // 1054 = unknown column, 1060 = duplicate col name (already exists as password_hash)
            if (e.errno !== 1054 && e.errno !== 1060 && e.errno !== 1091) throw e;
        }

        // Migration: if both `password` and `password_hash` columns exist, drop the old one
        try {
            await exec('ALTER TABLE users DROP COLUMN `password`');
            console.log('[MIGRATE] Dropped old password column');
        } catch (e) {
            // 1091 = can't drop field (doesn't exist) — safe to ignore
            if (e.errno !== 1091) throw e;
        }

        // Migration: add other missing auth columns if table pre-existed
        for (const [col, def] of [
            ['email',         'VARCHAR(255) DEFAULT NULL'],
            ['password_hash', 'VARCHAR(255) DEFAULT NULL'],
            ['created_at',    'BIGINT NOT NULL DEFAULT 0'],
        ]) {
            try { await exec(`ALTER TABLE users ADD COLUMN ${col} ${def}`); }
            catch (e) { if (e.errno !== 1060) throw e; }
        }

        await exec(`CREATE TABLE IF NOT EXISTS pads (
            pad_id      INT AUTO_INCREMENT PRIMARY KEY,
            user_id     INT NOT NULL,
            pad_title   VARCHAR(512) NOT NULL,
            pad_content LONGTEXT NOT NULL,
            created_at  BIGINT NOT NULL,
            updated_at  BIGINT NOT NULL
        )`);

        // Manage FK constraint gracefully
        try { await exec('ALTER TABLE pads DROP FOREIGN KEY pads_user_fk'); } catch (_) {}
        try { await exec('ALTER TABLE pads DROP FOREIGN KEY pads_ibfk_1'); } catch (_) {}
        try {
            await exec('ALTER TABLE pads ADD CONSTRAINT pads_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
        } catch (e) {
            if (e.errno !== 1826 && e.errno !== 1061) console.warn('[DB] FK warning:', e.message);
        }

        // Clean up expired notes
        const now = Date.now();
        await exec('DELETE FROM attachments WHERE note_key IN (SELECT note_key FROM notes WHERE expiry_time IS NOT NULL AND expiry_time < ?)', [now]);
        await exec('DELETE FROM notes WHERE expiry_time IS NOT NULL AND expiry_time < ?', [now]);

        console.log('✅ DB initialised — all tables ready');
    } finally {
        conn.release();
    }
}

/**
 * Try deleting from Cloudinary across all resource types.
 * Because uploads use resource_type:'auto', we can't know which type was used.
 */
async function cloudinaryDestroy(publicId) {
    for (const rt of ['image', 'raw', 'video']) {
        try {
            console.log(`[CLOUDINARY] Trying destroy ${publicId} as ${rt}`);
            const result = await cloudinary.uploader.destroy(publicId, { resource_type: rt });
            if (result.result === 'ok') {
                console.log(`[CLOUDINARY] Destroyed ${publicId} as ${rt}`);
                return result;
            }
        } catch (e) {
            console.log(`[CLOUDINARY] ${rt} destroy failed for ${publicId}:`, e.message);
        }
    }
    console.warn(`[CLOUDINARY] Could not destroy ${publicId} with any resource_type`);
    return { result: 'not found' };
}

/**
 * Helper: deletes all attachments for a pad from Cloudinary and DB.
 */
async function deletePadAttachments(key) {
    try {
        const [rows] = await pool.execute(
            'SELECT public_id FROM attachments WHERE note_key = ?',
            [key]
        );
        for (const row of rows) {
            await cloudinaryDestroy(row.public_id);
        }
        await pool.execute('DELETE FROM attachments WHERE note_key = ?', [key]);
    } catch (err) {
        console.error('Failed to cleanup attachments for pad:', key, err);
    }
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/health
 * Simple health check for keep-alive pings.
 */
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

/**
 * GET /api/notes/:key
 * Returns whether a note exists plus its encrypted content if so.
 */
app.get('/api/notes/:key', async (req, res) => {
    const { key } = req.params;
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM notes WHERE note_key = ? AND (expiry_time IS NULL OR expiry_time > ?)',
            [key, Date.now()]
        );
        if (rows.length === 0) {
            return res.json({ exists: false });
        }
        const note = rows[0];
        // If one-time and already viewed, treat as deleted
        if (note.one_time_view && note.viewed) {
            return res.json({ exists: false });
        }
        return res.json({
            exists: true,
            encryptedContent: note.encrypted_content,
            createdAt: note.created_at,
            expiryTime: note.expiry_time,
            oneTimeView: !!note.one_time_view,
            viewed: !!note.viewed,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * POST /api/notes
 * Body: { key, encryptedContent, expiryTime, oneTimeView }
 */
app.post('/api/notes', async (req, res) => {
    const { key, encryptedContent, expiryTime = null, oneTimeView = false, noteTitle = null } = req.body;
    if (!key || !encryptedContent) {
        return res.status(400).json({ error: 'key and encryptedContent are required' });
    }

    // Optionally link to a logged-in user if auth token is present
    let userId = null;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.id;
        } catch (_) { /* invalid token — treat as anonymous */ }
    }

    try {
        if (userId !== null) {
            // Logged-in user: link pad to account
            await pool.execute(
                `INSERT INTO notes (note_key, encrypted_content, created_at, expiry_time, one_time_view, viewed, user_id, note_title)
       VALUES (?, ?, ?, ?, ?, FALSE, ?, ?)
       ON DUPLICATE KEY UPDATE
         encrypted_content = VALUES(encrypted_content),
         created_at = VALUES(created_at),
         expiry_time = VALUES(expiry_time),
         one_time_view = VALUES(one_time_view),
         viewed = FALSE,
         user_id = COALESCE(user_id, VALUES(user_id)),
         note_title = COALESCE(note_title, VALUES(note_title))`,
                [key, encryptedContent, Date.now(), expiryTime, oneTimeView, userId, noteTitle]
            );
        } else {
            // Anonymous pad: omit user_id/note_title columns entirely
            await pool.execute(
                `INSERT INTO notes (note_key, encrypted_content, created_at, expiry_time, one_time_view, viewed)
       VALUES (?, ?, ?, ?, ?, FALSE)
       ON DUPLICATE KEY UPDATE
         encrypted_content = VALUES(encrypted_content),
         created_at = VALUES(created_at),
         expiry_time = VALUES(expiry_time),
         one_time_view = VALUES(one_time_view),
         viewed = FALSE`,
                [key, encryptedContent, Date.now(), expiryTime, oneTimeView]
            );
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * PUT /api/notes/:key
 * Body: { encryptedContent }
 */
app.put('/api/notes/:key', async (req, res) => {
    const { key } = req.params;
    const { encryptedContent } = req.body;
    if (!encryptedContent) {
        return res.status(400).json({ error: 'encryptedContent is required' });
    }
    try {
        const [result] = await pool.execute(
            'UPDATE notes SET encrypted_content = ? WHERE note_key = ?',
            [encryptedContent, key]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * PATCH /api/notes/:key/viewed
 * Marks a one-time note as viewed and deletes it.
 */
app.patch('/api/notes/:key/viewed', async (req, res) => {
    const { key } = req.params;
    try {
        await deletePadAttachments(key);
        await pool.execute('DELETE FROM notes WHERE note_key = ?', [key]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * DELETE /api/notes/:key
 */
app.delete('/api/notes/:key', async (req, res) => {
    const { key } = req.params;
    try {
        await deletePadAttachments(key);
        await pool.execute('DELETE FROM notes WHERE note_key = ?', [key]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ─── Attachment Routes ────────────────────────────────────────────────────────

/**
 * POST /api/attachments/:key
 * Uploads a file to Cloudinary and stores metadata in MySQL.
 */
app.post('/api/attachments/:key', (req, res) => {
    upload.single('file')(req, res, async (multerErr) => {
        if (multerErr) {
            console.error('[UPLOAD] Multer error:', multerErr.message);
            if (multerErr.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File too large. Max is 25 MB.' });
            }
            return res.status(400).json({ error: multerErr.message || 'Upload rejected' });
        }
        const { key } = req.params;
        if (!req.file) return res.status(400).json({ error: 'No file provided' });
        try {
            const { path: url, filename: public_id, originalname, mimetype, size } = req.file;
            console.log('[UPLOAD] File received:', originalname, mimetype, size, 'bytes');
            const [result] = await pool.execute(
                `INSERT INTO attachments (note_key, public_id, url, filename, file_type, size_bytes, uploaded_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [key, req.file.filename || public_id, url, originalname, mimetype, size, Date.now()]
            );
            res.json({
                id: result.insertId,
                success: true,
                url,
                public_id: req.file.filename || public_id,
                filename: originalname,
                file_type: mimetype,
                size_bytes: size,
            });
        } catch (err) {
            console.error('[UPLOAD] DB/Cloudinary error:', err);
            res.status(500).json({ error: 'Upload failed: ' + err.message });
        }
    });
});

/**
 * GET /api/attachments/:key
 * Returns all attachments for a pad.
 */
app.get('/api/attachments/:key', async (req, res) => {
    const { key } = req.params;
    try {
        const [rows] = await pool.execute(
            'SELECT id, public_id, url, filename, file_type, size_bytes, uploaded_at FROM attachments WHERE note_key = ? ORDER BY uploaded_at DESC',
            [key]
        );
        res.json({ attachments: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * DELETE /api/attachments/:key/:id
 * Deletes from Cloudinary and removes record from MySQL.
 */
app.delete('/api/attachments/:key/:id', async (req, res) => {
    const { key, id } = req.params;
    try {
        const [rows] = await pool.execute(
            'SELECT public_id FROM attachments WHERE id = ? AND note_key = ?',
            [id, key]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Attachment not found' });
        const { public_id } = rows[0];

        const result = await cloudinaryDestroy(public_id);

        await pool.execute('DELETE FROM attachments WHERE id = ?', [id]);
        res.json({ success: true, cloudinary_result: result });
    } catch (err) {
        console.error('[CLOUDINARY] Delete failed:', err);
        res.status(500).json({ error: 'Delete failed' });
    }
});

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secure-pad-super-secret-key-123';

// ─── Authentication Routes ────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Body: { username, email, password }
 */
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email and password are required' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, Date.now()]
        );
        res.status(201).json({ success: true, userId: result.insertId });
    } catch (err) {
        console.error('[AUTH] Register error:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        res.status(500).json({ error: 'Registration failed' });
    }
});

/**
 * POST /api/auth/login
 * Body: { identifier, password } (identifier can be username or email)
 */
app.post('/api/auth/login', async (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
        return res.status(400).json({ error: 'Username/Email and password are required' });
    }
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [identifier, identifier]
        );
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, user: { id: user.id, username: user.username, email: user.email } });
    } catch (err) {
        console.error('[AUTH] Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
        req.user = user;
        next();
    });
}

// ─── User Notes Routes (dashboard: list pads linked to this user account) ────

/**
 * GET /api/user/notes
 * Returns all notes linked to the authenticated user (for dashboard).
 */
app.get('/api/user/notes', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT note_key, note_title, created_at, expiry_time
             FROM notes WHERE user_id = ?
             ORDER BY created_at DESC`,
            [req.user.id]
        );
        res.json({ notes: rows });
    } catch (err) {
        console.error('[USER NOTES] Get all error:', err);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

/**
 * DELETE /api/user/notes/:key
 * Delete a note owned by the authenticated user.
 */
app.delete('/api/user/notes/:key', authenticateToken, async (req, res) => {
    try {
        const [result] = await pool.execute(
            'DELETE FROM notes WHERE note_key = ? AND user_id = ?',
            [req.params.key, req.user.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Note not found or unauthorized' });
        }
        // Also clean up attachments
        await deletePadAttachments(req.params.key);
        res.json({ success: true });
    } catch (err) {
        console.error('[USER NOTES] Delete error:', err);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

const path = require('path');

// ─── Static Files (Production) ────────────────────────────────────────────────
// Serve frontend dist folder if it exists
const fs2 = require('fs');
// In Docker dist is at /app/dist; locally it's ../dist from /backend
const distPath = fs2.existsSync('/app/dist') ? '/app/dist' : path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Handle SPA routing — redirect all non-API requests to index.html
app.get('*', (req, res, next) => {
    // If it's an API request that wasn't caught yet, move to 404
    if (req.path.startsWith('/api/')) return next();

    res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) {
            // If index.html is missing, we're likely in dev mode or build failed
            res.status(404).send('Frontend not built. Run "npm run build" first.');
        }
    });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

initDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });

        // ─── Background Cleanup: Every 1 hour ──────────────────────────────────
        setInterval(async () => {
            try {
                const now = Date.now();
                const [expired] = await pool.execute(
                    'SELECT note_key FROM notes WHERE expiry_time IS NOT NULL AND expiry_time < ?',
                    [now]
                );
                for (const row of expired) {
                    console.log(`🧹 Cleaning up expired pad: ${row.note_key}`);
                    await deletePadAttachments(row.note_key);
                    await pool.execute('DELETE FROM notes WHERE note_key = ?', [row.note_key]);
                }
            } catch (err) {
                console.error('Background cleanup failed:', err);
            }
        }, 1000 * 60 * 60); // 1 hour

        // ─── Render Keep-Alive: Self-ping every 45s (if URL provided) ──────────
        const PUBLIC_URL = process.env.PUBLIC_URL;
        if (PUBLIC_URL) {
            setInterval(() => {
                const healthUrl = PUBLIC_URL.endsWith('/') ? `${PUBLIC_URL}api/health` : `${PUBLIC_URL}/api/health`;
                console.log(`[KEEP-ALIVE] Self-pinging ${healthUrl}`);
                fetch(healthUrl).catch(err => console.error('[KEEP-ALIVE] Self-ping failed:', err.message));
            }, 45000); // 45 seconds (Render sleeps after 50s)
        }
    })
    .catch((err) => {
        console.error('❌ Failed to initialise DB:', err.message);
        process.exit(1);
    });


