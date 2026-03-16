import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import MatrixRain from '@/components/MatrixRain';
import { noteExists, viewNote, createNote, updateNote, deleteNote } from '@/lib/noteService';
import { listAttachments, uploadAttachment, deleteAttachment, Attachment } from '@/lib/attachmentService';

type Phase = 'loading' | 'editor' | 'deleted' | 'error';

export default function PadView() {
  const { padKey } = useParams<{ padKey: string }>();
  const location = useLocation();
  const passphrase: string = (location.state as { passphrase?: string })?.passphrase || '';

  const [phase, setPhase] = useState<Phase>('loading');
  const [content, setContent] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Attachments
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!padKey || !passphrase) return;
    (async () => {
      try {
        const exists = await noteExists(padKey);
        if (exists) {
          const decrypted = await viewNote(padKey, passphrase);
          setContent(decrypted);
          setIsNew(false);
          // Load attachments for existing pads
          const atts = await listAttachments(padKey);
          setAttachments(atts);
        } else {
          setContent('');
          setIsNew(true);
        }
        setPhase('editor');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Decryption failed');
        setPhase('error');
      }
    })();
  }, [padKey, passphrase]);

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    try {
      if (isNew) {
        await createNote(padKey!, content, passphrase);
        setIsNew(false);
        // Load attachments after creating note
        const atts = await listAttachments(padKey!);
        setAttachments(atts);
      } else {
        await updateNote(padKey!, content, passphrase);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    await deleteNote(padKey!);
    setPhase('deleted');
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !padKey) return;
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 25 MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    setUploadError('');
    try {
      const att = await uploadAttachment(padKey, file, (pct) => setUploadProgress(pct));
      setAttachments(prev => [att, ...prev]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (id: number) => {
    if (!padKey) return;
    try {
      await deleteAttachment(padKey, id);
      setAttachments(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const formatBytes = (b: number) =>
    b < 1024 ? `${b}B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)}KB` : `${(b / 1024 / 1024).toFixed(1)}MB`;

  // ── shared page shell ──────────────────────────────────────────────────────
  const shell = (children: React.ReactNode) => (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', flexDirection: 'column', position: 'relative', direction: 'ltr' }}>
      <MatrixRain />
      {/* Scanline — behind content */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,65,0.015) 2px,rgba(0,255,65,0.015) 4px)', pointerEvents: 'none', zIndex: 1 }} />
      <header style={{ position: 'relative', zIndex: 10, borderBottom: '1px solid #00ff4122', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.7)' }}>
        <span style={{ color: '#00ff41', fontFamily: 'monospace', fontSize: 13, letterSpacing: 4 }}>SECURE_PAD</span>
        <span className="mobile-hide" style={{ marginLeft: 'auto', color: '#1a5c2a', fontFamily: 'monospace', fontSize: 11 }}>{new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC</span>
      </header>
      <main style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 12px 40px', direction: 'ltr' }}>
        {children}
      </main>
    </div>
  );

  if (phase === 'deleted') return shell(
    <div style={{ textAlign: 'center', border: '1px solid #00ff4133', background: 'rgba(0,0,0,0.88)', padding: '40px 20px', maxWidth: 380, width: '100%', borderRadius: 2, fontFamily: 'monospace' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>💀</div>
      <div style={{ color: '#00ff41', fontSize: 14, letterSpacing: 4, marginBottom: 8 }}>PAD_DESTROYED</div>
      <div style={{ color: '#1a6630', fontSize: 11, marginBottom: 24 }}>Data permanently wiped.</div>
      <Link to="/" style={{ color: '#00ff41', fontFamily: 'monospace', fontSize: 11, letterSpacing: 3, border: '1px solid #00ff4155', padding: '8px 16px', textDecoration: 'none', borderRadius: 2 }}>[ RETURN HOME ]</Link>
    </div>
  );

  if (phase === 'loading') return shell(
    <div style={{ textAlign: 'center', border: '1px solid #00ff4133', background: 'rgba(0,0,0,0.88)', padding: '40px 20px', maxWidth: 380, width: '100%', borderRadius: 2, fontFamily: 'monospace' }}>
      <div style={{ color: '#00ff41', fontSize: 13, letterSpacing: 4, marginBottom: 8 }}>DECRYPTING PAD…</div>
      <div style={{ color: '#1a6630', fontSize: 11 }}>AES-256 key derivation in progress</div>
    </div>
  );

  if (phase === 'error') return shell(
    <div style={{ textAlign: 'center', border: '1px solid #ff003c55', background: 'rgba(0,0,0,0.88)', padding: '40px 20px', maxWidth: 380, width: '100%', borderRadius: 2, fontFamily: 'monospace' }}>
      <div style={{ color: '#ff003c', fontSize: 14, letterSpacing: 4, marginBottom: 8 }}>ACCESS_DENIED</div>
      <div style={{ color: '#7a001e', fontSize: 11, marginBottom: 24 }}>{error}</div>
      <Link to="/" style={{ color: '#ff003c', fontFamily: 'monospace', fontSize: 11, letterSpacing: 3, border: '1px solid #ff003c55', padding: '8px 16px', textDecoration: 'none', borderRadius: 2 }}>[ RE-AUTHENTICATE ]</Link>
    </div>
  );

  // ── hacker upload logs ──
  const hackerLogs = [
    '[SECTOR 04] Initializing data stream…',
    '[CRYPTO] AES-256-CTR handshake OK',
    '[NET] Establishing secure tunnel…',
    '[DISK] Allocating encrypted blocks…',
    '[VERIFY] Checksum validation in progress…',
    '[SYNC] Replicating to cloud node…',
    '[GUARD] Firewall bypass confirmed…',
    '[BUFFER] Writing to secure buffer…',
  ];

  const UploadOverlay = () => {
    const filled = Math.floor(uploadProgress / 5); // 20 total blocks
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
    const logCount = Math.min(Math.floor(uploadProgress / 12) + 1, hackerLogs.length);

    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          background: 'rgba(2,5,2,0.98)',
          border: '1px solid #00ff4133',
          borderRadius: 4,
          padding: '32px 28px',
          maxWidth: 420,
          width: '90%',
          fontFamily: 'monospace',
          boxShadow: '0 0 40px rgba(0,255,65,0.1), 0 0 80px rgba(0,0,0,0.8)',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#00ff41',
              boxShadow: '0 0 8px #00ff41',
              animation: 'blink 1s ease-in-out infinite',
            }} />
            <span style={{ color: '#00ff41', fontSize: 12, letterSpacing: 3 }}>UPLOADING FILE</span>
          </div>

          {/* Progress percentage — big glitchy number */}
          <div style={{
            textAlign: 'center',
            fontSize: 48,
            fontWeight: 700,
            color: '#00ff41',
            textShadow: '0 0 10px #00ff41, 0 0 30px #00ff4166',
            marginBottom: 16,
            animation: uploadProgress < 100 ? 'glitchFlicker 0.3s ease-out' : 'none',
            letterSpacing: 2,
          }}>
            {uploadProgress}%
          </div>

          {/* ASCII progress bar */}
          <div style={{
            background: 'rgba(0,0,0,0.8)',
            border: '1px solid #00ff4133',
            borderRadius: 2,
            padding: '8px 12px',
            marginBottom: 16,
            textAlign: 'center',
          }}>
            <span style={{ color: '#00ff41', fontSize: 12, letterSpacing: 1 }}>[{bar}]</span>
          </div>

          {/* Animated green bar underneath */}
          <div style={{
            height: 3,
            background: '#00ff4122',
            borderRadius: 2,
            marginBottom: 20,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${uploadProgress}%`,
              background: 'linear-gradient(90deg, #00ff41, #00cc33, #00ff41)',
              backgroundSize: '200% 100%',
              animation: 'scanSweep 1.5s linear infinite',
              borderRadius: 2,
              transition: 'width 0.3s ease',
              boxShadow: '0 0 8px #00ff41',
            }} />
          </div>

          {/* Hacker system logs */}
          <div style={{
            borderTop: '1px solid #00ff4122',
            paddingTop: 12,
            maxHeight: 120,
            overflow: 'hidden',
          }}>
            {hackerLogs.slice(0, logCount).map((log, i) => (
              <div
                key={i}
                className="anim-fadeInUp"
                style={{
                  color: '#1a5c2a',
                  fontSize: 9,
                  lineHeight: 1.8,
                  opacity: i === logCount - 1 ? 1 : 0.5,
                }}
              >
                {log}
                {i === logCount - 1 && <span style={{ animation: 'blink 0.6s step-end infinite' }}> █</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── editor ─────────────────────────────────────────────────────────────────
  return shell(
    <div className="anim-fadeInUp" style={{
      width: '100%',
      maxWidth: 720,
      direction: 'ltr',
      background: 'rgba(2,2,2,0.95)',
      backdropFilter: 'blur(24px)',
      border: '1px solid #00ff4118',
      borderRadius: 4,
      padding: '20px 16px',
      boxShadow: '0 0 60px rgba(0,0,0,0.9), 0 0 120px rgba(0,0,0,0.6)',
    }}>
      {uploading && <UploadOverlay />}
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'monospace', fontSize: 11, color: '#1a6630', textDecoration: 'none', marginBottom: 16, letterSpacing: 2 }}>← ../home</Link>

      {/* ── Main editor card ── */}
      <div style={{ border: '1px solid #00ff4133', background: 'rgba(5,5,5,0.98)', padding: '16px 14px', borderRadius: 2, position: 'relative', direction: 'ltr', marginBottom: 12 }}>
        {/* Corner brackets */}
        <div style={{ position: 'absolute', top: -1, left: -1, width: 12, height: 12, borderTop: '2px solid #00ff41', borderLeft: '2px solid #00ff41' }} />
        <div style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderBottom: '2px solid #00ff41', borderRight: '2px solid #00ff41' }} />

        {/* Titlebar */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #00ff4122' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 6px #00ff41' }} />
              <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#00aa33', letterSpacing: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isNew ? 'NEW_PAD' : 'PAD_OPEN'}
              </span>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#0d4f1c', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              key: <span style={{ color: '#1a8c3c' }}>{padKey}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 12 }}>
            <button onClick={handleCopyLink} title="Copy link" style={iconBtn}>{copied ? '✓' : '⎘'}</button>
            <button onClick={handleDelete} title="Destroy pad" style={{ ...iconBtn, color: '#ff003c', borderColor: '#ff003c44' }}>✕</button>
          </div>
        </div>

        {/* Textarea */}
        <textarea
          dir="ltr"
          lang="en"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          value={content}
          onChange={e => setContent(e.target.value)}
          autoFocus
          style={{
            direction: 'ltr',
            unicodeBidi: 'embed',
            writingMode: 'horizontal-tb',
            textAlign: 'left',
            width: '100%',
            boxSizing: 'border-box',
            minHeight: 280,
            resize: 'vertical',
            background: 'rgba(0,0,0,0.7)',
            border: '1px solid #00ff4133',
            borderRadius: 2,
            padding: '12px 14px',
            fontFamily: 'monospace',
            fontSize: 14,
            color: '#7fffb0',
            outline: 'none',
            caretColor: '#00ff41',
            lineHeight: 1.6,
          }}
        />

        {error && <div style={{ color: '#ff003c', fontFamily: 'monospace', fontSize: 10, marginTop: 10 }}>⚠ {error}</div>}

        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            marginTop: 14,
            width: '100%',
            padding: '13px 16px',
            background: saved ? 'rgba(0,255,65,0.18)' : 'rgba(0,255,65,0.08)',
            border: `1px solid ${saved ? '#00ff41' : '#00ff4155'}`,
            borderRadius: 2,
            color: '#00ff41',
            fontFamily: 'monospace',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 2,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.5 : 1,
            boxShadow: saved ? '0 0 16px #00ff4155' : '0 0 8px #00ff4122',
          }}
        >
          {saved ? '[ SAVED ✓ ]' : loading ? '[ ENCRYPTING… ]' : '[ SAVE & ENCRYPT ]'}
        </button>
      </div>

      {/* ── Attachments card ── */}
      <div
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#00ff41'; e.currentTarget.style.background = 'rgba(0,255,65,0.08)'; }}
        onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#00ff4122'; e.currentTarget.style.background = 'rgba(0,0,0,0.80)'; }}
        onDrop={async (e) => {
          e.preventDefault();
          e.currentTarget.style.borderColor = '#00ff4122';
          e.currentTarget.style.background = 'rgba(0,0,0,0.80)';
          const file = e.dataTransfer.files?.[0];
          if (file && padKey) {
            if (file.size > MAX_FILE_SIZE) {
              setUploadError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 25 MB.`);
              return;
            }
            setUploading(true);
            setUploadProgress(0);
            setUploadError('');
            try {
              const att = await uploadAttachment(padKey, file, (pct) => setUploadProgress(pct));
              setAttachments(prev => [att, ...prev]);
            } catch (err) {
              setUploadError(err instanceof Error ? err.message : 'Upload failed');
            } finally {
              setUploading(false);
            }
          }
        }}
        style={{ border: '1px solid #00ff4122', background: 'rgba(5,5,5,0.98)', padding: '16px 14px', borderRadius: 2, direction: 'ltr', transition: 'all 0.2s' }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#1a8c3c', letterSpacing: 2 }}>📎 ATTACHMENTS (DRAG & DROP)</span>
          <div style={{ width: '100%' }}>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
              accept="*/*"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                width: '100%',
                background: 'transparent',
                border: '1px solid #00ff4155',
                borderRadius: 2,
                color: '#00ff41',
                fontFamily: 'monospace',
                fontSize: 10,
                letterSpacing: 1,
                padding: '8px 12px',
                cursor: uploading ? 'wait' : 'pointer',
                opacity: uploading ? 0.5 : 1,
              }}
            >
              {uploading ? '[ UPLOADING… ]' : '[ + ATTACH FILE ]'}
            </button>
          </div>
        </div>

        {uploadError && <div style={{ color: '#ff003c', fontFamily: 'monospace', fontSize: 10, marginBottom: 10 }}>⚠ {uploadError}</div>}

        {attachments.length === 0 ? (
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#0d3d1c', textAlign: 'center', padding: '12px 0' }}>
            No attachments.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {attachments.map(att => (
              <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', background: 'rgba(0,255,65,0.04)', border: '1px solid #00ff4122', borderRadius: 2 }}>
                <span style={{ fontSize: 16 }}>
                  {att.file_type?.startsWith('image/') ? '🖼️' : '📄'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontFamily: 'monospace', fontSize: 11, color: '#7fffb0', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {att.filename}
                  </a>
                  <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#0d4f1c' }}>
                    {formatBytes(att.size_bytes)}
                  </span>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const resp = await fetch(att.url);
                      const blob = await resp.blob();
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = att.filename;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(a.href);
                    } catch {
                      window.open(att.url, '_blank');
                    }
                  }}
                  style={{
                    background: 'rgba(0,255,65,0.05)',
                    border: '1px solid rgba(0,255,65,0.3)',
                    borderRadius: 2,
                    color: '#00ff41',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontSize: 9,
                    padding: '4px 6px',
                  }}
                >
                  [ ⬇ ]
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete "${att.filename}"?`)) {
                      handleDeleteAttachment(att.id);
                    }
                  }}
                  style={{
                    background: 'rgba(255,0,60,0.05)',
                    border: '1px solid rgba(255,0,60,0.3)',
                    borderRadius: 2,
                    color: '#ff003c',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontSize: 9,
                    padding: '4px 6px',
                  }}
                >
                  [ X ]
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #00ff4133',
  borderRadius: 2,
  color: '#1a8c3c',
  fontFamily: 'monospace',
  fontSize: 13,
  padding: '4px 8px',
  cursor: 'pointer',
};
