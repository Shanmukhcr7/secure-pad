import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MatrixRain from '@/components/MatrixRain';

export default function Index() {
  const [padKey, setPadKey] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = padKey.trim();
    if (!trimmed) return;
    navigate(`/pad/${encodeURIComponent(trimmed)}`, {
      state: { passphrase: trimmed },
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', flexDirection: 'column', position: 'relative', direction: 'ltr' }}>
      <MatrixRain />

      {/* Scanline — behind content */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.015) 2px, rgba(0,255,65,0.015) 4px)', pointerEvents: 'none', zIndex: 1 }} />

      {/* Header */}
      <header style={{ position: 'relative', zIndex: 10, borderBottom: '1px solid #00ff4122', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 16, backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.7)', direction: 'ltr' }}>
        <span style={{ color: '#00ff41', fontFamily: 'monospace', fontSize: 13, letterSpacing: 4 }}>SECURE_PAD</span>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
          {localStorage.getItem('secure_pad_auth_token') ? (
            <button onClick={() => navigate('/dashboard')} style={{ background: 'rgba(0,255,65,0.1)', border: '1px solid #00ff4155', color: '#00ff41', fontFamily: 'monospace', fontSize: 11, padding: '4px 8px', borderRadius: 2, cursor: 'pointer', letterSpacing: 1 }}>[ DASHBOARD ]</button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => navigate('/login')} style={{ background: 'transparent', border: '1px solid #00ff4133', color: '#1a8c3c', fontFamily: 'monospace', fontSize: 11, padding: '4px 8px', borderRadius: 2, cursor: 'pointer' }}>[ LOGIN ]</button>
              <button onClick={() => navigate('/register')} style={{ background: 'rgba(0,255,65,0.1)', border: '1px solid #00ff4155', color: '#00ff41', fontFamily: 'monospace', fontSize: 11, padding: '4px 8px', borderRadius: 2, cursor: 'pointer' }}>[ REGISTER ]</button>
            </div>
          )}
          <span className="mobile-hide" style={{ color: '#1a5c2a', fontFamily: 'monospace', fontSize: 11 }}>{new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC</span>
        </div>
      </header>

      {/* Main */}
      <main style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', direction: 'ltr' }}>

        {/* ── Centered content box ── */}
        <div style={{
          background: 'rgba(2,2,2,0.95)',
          backdropFilter: 'blur(24px)',
          border: '1px solid #00ff4118',
          borderRadius: 4,
          padding: '32px 24px',
          maxWidth: 460,
          width: '100%',
          boxShadow: '0 0 60px rgba(0,0,0,0.9), 0 0 120px rgba(0,0,0,0.6)',
        }}>

          {/* Boot log — staggered fade-in */}
          <div style={{ width: '100%', maxWidth: 480, marginBottom: 24, fontFamily: 'monospace', fontSize: 10, color: '#1a5c2a', lineHeight: 1.6, opacity: 0.8 }}>
            {['SECURE_PAD OS v2.4.1 — kernel loaded', 'AES-256 encryption module... OK', 'Zero-knowledge protocol engaged... OK'].map((line, i) => (
              <div key={i} className={`anim-fadeInUp anim-delay-${i + 1}`}><span style={{ color: '#0d3d1c', marginRight: 8 }}>[{String(i).padStart(2, '0')}]</span>{line}</div>
            ))}
          </div>

          {/* Title — glitch animation */}
          <div className="anim-glitch" style={{ textAlign: 'center', marginBottom: 32, width: '100%' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', border: '1px solid #00ff4133', background: 'rgba(0,0,0,0.6)', marginBottom: 16, borderRadius: 2 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 6px #00ff41' }} />
              <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#1a8c3c', letterSpacing: 2 }}>AES-256 · ZERO-KNOWLEDGE</span>
            </div>
            <h1 style={{
              fontFamily: 'monospace',
              fontSize: 'clamp(32px, 12vw, 52px)',
              fontWeight: 700,
              color: '#00ff41',
              letterSpacing: -1,
              margin: '0 0 12px 0',
              textShadow: '0 0 10px #00ff41, 0 0 30px #00ff4166',
              width: '100%'
            }}>
              SECURE_PAD
            </h1>
            <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#1a6630', margin: '0 auto', lineHeight: 1.6, maxWidth: 300 }}>
              No accounts. No logs.<br />Server is blind.
            </p>
          </div>

          {/* Form — slide up */}
          <form onSubmit={handleSubmit} className="anim-fadeInUp anim-delay-5" style={{ width: '100%' }}>
            <div style={{ border: '1px solid #00ff4133', background: 'rgba(5,5,5,0.98)', padding: '20px 16px', borderRadius: 2, position: 'relative' }}>
              {/* Corner brackets */}
              <div style={{ position: 'absolute', top: -1, left: -1, width: 12, height: 12, borderTop: '2px solid #00ff41', borderLeft: '2px solid #00ff41' }} />
              <div style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderBottom: '2px solid #00ff41', borderRight: '2px solid #00ff41' }} />

              <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#1a6630', marginBottom: 12 }}>
                <span style={{ color: '#00aa33' }}>root@secure-pad</span>
                <span style={{ color: '#0d3d1c' }}>:~$ </span>
                <span style={{ color: '#1a8c3c' }}>open_pad</span>
              </div>

              <div style={{ position: 'relative', marginBottom: 14 }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontFamily: 'monospace', color: '#1a6630', fontSize: 13, userSelect: 'none', pointerEvents: 'none' }}>{'>'}_</span>
                <input
                  dir="ltr"
                  type="password"
                  value={padKey}
                  onChange={e => setPadKey(e.target.value)}
                  placeholder="secret key"
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  style={{
                    direction: 'ltr',
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'rgba(0,0,0,0.9)',
                    border: '1px solid #00ff4133',
                    borderRadius: 2,
                    padding: '10px 12px 10px 38px',
                    fontFamily: 'monospace',
                    fontSize: 14,
                    color: '#7fffb0',
                    outline: 'none',
                    caretColor: '#00ff41',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={!padKey.trim()}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: padKey.trim() ? 'rgba(0,255,65,0.1)' : 'transparent',
                  border: '1px solid #00ff4155',
                  borderRadius: 2,
                  color: '#00ff41',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 2,
                  cursor: padKey.trim() ? 'pointer' : 'not-allowed',
                  opacity: padKey.trim() ? 1 : 0.4,
                  boxShadow: padKey.trim() ? '0 0 10px #00ff4133' : 'none',
                }}
              >
                [ ACCESS_PAD ]
              </button>
            </div>
          </form>

        </div>{/* end centered content box */}
      </main>

      <footer style={{ position: 'relative', zIndex: 10, borderTop: '1px solid #00ff4111', padding: '12px 0', textAlign: 'center' }}>
        <p style={{ fontFamily: 'monospace', fontSize: 9, color: '#0d3d1c', letterSpacing: 2, margin: 0 }}>NO_TELEMETRY · OPEN_PROTOCOL</p>
      </footer>
    </div>
  );
}
