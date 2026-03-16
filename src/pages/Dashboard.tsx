import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MatrixRain from '@/components/MatrixRain';
import { getUserNotes, UserNote, deleteUserNote, logout, getAuthUser } from '@/lib/authService';

export default function Dashboard() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showNewPad, setShowNewPad] = useState(false);
  const [newCode, setNewCode] = useState('');

  const user = getAuthUser();

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    (async () => {
      try {
        const data = await getUserNotes();
        setNotes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pads');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleOpenCode = (e: React.FormEvent) => {
    e.preventDefault();
    const code = newCode.trim();
    if (!code) return;
    setShowNewPad(false);
    setNewCode('');
    navigate(`/pad/${encodeURIComponent(code)}`, { state: { passphrase: code } });
  };

  const handleDelete = async (noteKey: string) => {
    if (!window.confirm('Delete this pad permanently?')) return;
    setDeleting(noteKey);
    try {
      await deleteUserNote(noteKey);
      setNotes(prev => prev.filter(n => n.note_key !== noteKey));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const formatDate = (ts: number) => new Date(ts).toLocaleString();

  const shell = (children: React.ReactNode) => (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', flexDirection: 'column', position: 'relative', direction: 'ltr' }}>
      <MatrixRain />
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,65,0.015) 2px,rgba(0,255,65,0.015) 4px)', pointerEvents: 'none', zIndex: 1 }} />
      <header style={{ position: 'relative', zIndex: 10, borderBottom: '1px solid #00ff4122', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 16, backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.7)' }}>
        <button onClick={() => navigate('/')} style={{ textDecoration: 'none', color: '#00ff41', fontFamily: 'monospace', fontSize: 13, letterSpacing: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>SECURE_PAD</button>
        <span style={{ color: '#00aa33', fontFamily: 'monospace', fontSize: 11 }}>[{user?.username}]</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="mobile-hide" style={{ color: '#1a5c2a', fontFamily: 'monospace', fontSize: 11 }}>{new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC</span>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid #ff003c55', color: '#ff003c', fontFamily: 'monospace', fontSize: 10, padding: '4px 8px', borderRadius: 2, cursor: 'pointer' }}>[ LOGOUT ]</button>
        </div>
      </header>
      <main style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 12px 40px', direction: 'ltr' }}>
        {children}
      </main>
    </div>
  );

  return shell(
    <div className="anim-fadeInUp" style={{
      width: '100%', maxWidth: 800, direction: 'ltr',
      background: 'rgba(2,2,2,0.95)', backdropFilter: 'blur(24px)',
      border: '1px solid #00ff4118', borderRadius: 4, padding: '24px',
      boxShadow: '0 0 60px rgba(0,0,0,0.9)',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, borderBottom: '1px solid #00ff4133', paddingBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'monospace', color: '#00ff41', fontSize: 20, margin: '0 0 4px 0', letterSpacing: 3 }}>MY_PADS</h2>
          <p style={{ fontFamily: 'monospace', color: '#1a6630', fontSize: 11, margin: 0 }}>Your encrypted pads — accessible by code or from here</p>
        </div>
        <button onClick={() => setShowNewPad(v => !v)} style={{
          padding: '8px 12px', background: 'rgba(0,255,65,0.1)', border: '1px solid #00ff4155', borderRadius: 2,
          color: '#00ff41', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: 'pointer'
        }}>
          {showNewPad ? '[ CANCEL ]' : '[ + NEW_PAD ]'}
        </button>
      </div>

      {/* Inline code-entry panel */}
      {showNewPad && (
        <form onSubmit={handleOpenCode} style={{
          marginBottom: 20, padding: '14px 16px',
          background: 'rgba(0,255,65,0.04)', border: '1px solid #00ff4155', borderRadius: 2
        }}>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#1a8c3c', letterSpacing: 2, marginBottom: 8 }}>ENTER PAD CODE</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              autoFocus
              value={newCode}
              onChange={e => setNewCode(e.target.value)}
              placeholder="type-your-code-here"
              style={{
                flex: 1, background: 'rgba(0,0,0,0.7)', border: '1px solid #00ff4133',
                borderRadius: 2, padding: '8px 12px', fontFamily: 'monospace', fontSize: 13,
                color: '#7fffb0', outline: 'none', caretColor: '#00ff41'
              }}
            />
            <button type="submit" style={{
              background: 'rgba(0,255,65,0.12)', border: '1px solid #00ff4155', borderRadius: 2,
              color: '#00ff41', fontFamily: 'monospace', fontSize: 11, padding: '8px 14px', cursor: 'pointer'
            }}>[ OPEN ]</button>
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#0d4f1c', marginTop: 6 }}>
            New code → creates a new pad &nbsp;|&nbsp; Existing code → opens your pad · pad is saved to your account on first save
          </div>
        </form>
      )}

      {error && <div style={{ color: '#ff003c', fontFamily: 'monospace', fontSize: 11, marginBottom: 16 }}>⚠ {error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#00ff41', fontFamily: 'monospace', fontSize: 12 }}>SCANNING VOLUMES...</div>
      ) : notes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', border: '1px dashed #00ff4133', borderRadius: 2, background: 'rgba(0,255,65,0.02)' }}>
          <div style={{ color: '#1a6630', fontFamily: 'monospace', fontSize: 12, marginBottom: 16 }}>No pads found. Click [ + NEW_PAD ] to get started.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notes.map(note => (
            <div key={note.note_key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', background: 'rgba(0,255,65,0.04)',
              border: '1px solid #00ff4122', borderRadius: 2,
            }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
                <div style={{
                  fontFamily: 'monospace', fontSize: 14, color: '#7fffb0',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4
                }}>
                  {note.note_title || note.note_key}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#0d4f1c', display: 'flex', gap: 16 }}>
                  <span>code: <span style={{ color: '#1a6630' }}>{note.note_key}</span></span>
                  <span>created: {formatDate(note.created_at)}</span>
                  {note.expiry_time && <span style={{ color: '#ff6622' }}>expires: {formatDate(note.expiry_time)}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => navigate(`/pad/${note.note_key}`, { state: { passphrase: note.note_key } })}
                  style={{
                    background: 'transparent', border: '1px solid #00ff4133', borderRadius: 2,
                    color: '#1a8c3c', fontFamily: 'monospace', fontSize: 11, padding: '4px 8px', cursor: 'pointer'
                  }}
                >[ OPEN ]</button>
                <button
                  onClick={() => handleDelete(note.note_key)}
                  disabled={deleting === note.note_key}
                  style={{
                    background: 'transparent', border: '1px solid #ff003c44', borderRadius: 2,
                    color: '#ff003c', fontFamily: 'monospace', fontSize: 11, padding: '4px 8px', cursor: 'pointer',
                    opacity: deleting === note.note_key ? 0.5 : 1
                  }}
                >[ DEL ]</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
