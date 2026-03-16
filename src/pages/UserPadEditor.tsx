import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import MatrixRain from '@/components/MatrixRain';
import { getUserPadById, createUserPad, updateUserPad, deleteUserPad } from '@/lib/authService';

type Phase = 'loading' | 'editor' | 'error';

export default function UserPadEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [phase, setPhase] = useState<Phase>('loading');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isNew) {
      setPhase('editor');
      return;
    }
    
    (async () => {
      try {
        const padId = parseInt(id || '0');
        if (!padId) throw new Error('Invalid pad ID');
        const pad = await getUserPadById(padId);
        setTitle(pad.pad_title);
        setContent(pad.pad_content || '');
        setPhase('editor');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pad');
        setPhase('error');
      }
    })();
  }, [id, isNew]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setLoading(true);
    setSaved(false);
    setError('');
    
    try {
      if (isNew) {
        const newId = await createUserPad(title, content);
        setSaved(true);
        setTimeout(() => {
          navigate(`/dashboard/pad/${newId}`, { replace: true });
        }, 1000);
      } else {
        await updateUserPad(parseInt(id!), title, content);
        setSaved(true);
        setTimeout(() => setSaved(false), 2200);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this pad?')) return;
    try {
      if (!isNew) {
        await deleteUserPad(parseInt(id!));
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const shell = (children: React.ReactNode) => (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', flexDirection: 'column', position: 'relative', direction: 'ltr' }}>
      <MatrixRain />
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

  if (phase === 'loading') return shell(
    <div style={{ textAlign: 'center', border: '1px solid #00ff4133', background: 'rgba(0,0,0,0.88)', padding: '40px 20px', maxWidth: 380, width: '100%', borderRadius: 2, fontFamily: 'monospace' }}>
      <div style={{ color: '#00ff41', fontSize: 13, letterSpacing: 4, marginBottom: 8 }}>LOADING PAD…</div>
      <div style={{ color: '#1a6630', fontSize: 11 }}>Retrieving encrypted sectors</div>
    </div>
  );

  if (phase === 'error') return shell(
    <div style={{ textAlign: 'center', border: '1px solid #ff003c55', background: 'rgba(0,0,0,0.88)', padding: '40px 20px', maxWidth: 380, width: '100%', borderRadius: 2, fontFamily: 'monospace' }}>
      <div style={{ color: '#ff003c', fontSize: 14, letterSpacing: 4, marginBottom: 8 }}>ACCESS_DENIED</div>
      <div style={{ color: '#7a001e', fontSize: 11, marginBottom: 24 }}>{error}</div>
      <Link to="/dashboard" style={{ color: '#ff003c', fontFamily: 'monospace', fontSize: 11, letterSpacing: 3, border: '1px solid #ff003c55', padding: '8px 16px', textDecoration: 'none', borderRadius: 2 }}>[ RETURN TO DASHBOARD ]</Link>
    </div>
  );

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
      <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'monospace', fontSize: 11, color: '#1a6630', textDecoration: 'none', marginBottom: 16, letterSpacing: 2 }}>← ../dashboard</Link>

      <div style={{ border: '1px solid #00ff4133', background: 'rgba(5,5,5,0.98)', padding: '16px 14px', borderRadius: 2, position: 'relative', direction: 'ltr', marginBottom: 12 }}>
        <div style={{ position: 'absolute', top: -1, left: -1, width: 12, height: 12, borderTop: '2px solid #00ff41', borderLeft: '2px solid #00ff41' }} />
        <div style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderBottom: '2px solid #00ff41', borderRight: '2px solid #00ff41' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #00ff4122' }}>
          <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 6px #00ff41' }} />
              <input 
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="pad_title"
                style={{
                  background: 'transparent', border: 'none', borderBottom: '1px dashed #00ff4155', outline: 'none',
                  color: '#00ff41', fontFamily: 'monospace', fontSize: 13, letterSpacing: 1, width: '100%',
                }}
              />
            </div>
            {!isNew && (
              <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#0d4f1c', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                id: <span style={{ color: '#1a8c3c' }}>#{id}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleDelete} title="Destroy pad" style={{ 
              background: 'transparent', border: '1px solid #ff003c55', borderRadius: 2,
              color: '#ff003c', fontFamily: 'monospace', fontSize: 13, padding: '4px 8px', cursor: 'pointer',
            }}>✕</button>
          </div>
        </div>

        <textarea
          dir="ltr"
          lang="en"
          spellCheck={false}
          value={content}
          onChange={e => setContent(e.target.value)}
          autoFocus={isNew}
          placeholder="Enter secure data..."
          style={{
            direction: 'ltr',
            width: '100%', boxSizing: 'border-box', minHeight: 280, resize: 'vertical',
            background: 'rgba(0,0,0,0.7)', border: '1px solid #00ff4133', borderRadius: 2,
            padding: '12px 14px', fontFamily: 'monospace', fontSize: 14, color: '#7fffb0',
            outline: 'none', caretColor: '#00ff41', lineHeight: 1.6,
          }}
        />

        {error && <div style={{ color: '#ff003c', fontFamily: 'monospace', fontSize: 10, marginTop: 10 }}>⚠ {error}</div>}

        <button
          onClick={handleSave}
          disabled={loading || !title.trim() || !content.trim()}
          style={{
            marginTop: 14, width: '100%', padding: '13px 16px',
            background: saved ? 'rgba(0,255,65,0.18)' : 'rgba(0,255,65,0.08)',
            border: `1px solid ${saved ? '#00ff41' : '#00ff4155'}`, borderRadius: 2,
            color: '#00ff41', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, letterSpacing: 2,
            cursor: loading ? 'wait' : 'pointer', opacity: loading || !title.trim() || !content.trim() ? 0.5 : 1,
            boxShadow: saved ? '0 0 16px #00ff4155' : '0 0 8px #00ff4122',
          }}
        >
          {saved ? '[ SAVED ✓ ]' : loading ? '[ SYNCING… ]' : '[ SAVE PAD ]'}
        </button>
      </div>
    </div>
  );
}
