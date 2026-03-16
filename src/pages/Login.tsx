import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import MatrixRain from '@/components/MatrixRain';
import { login } from '@/lib/authService';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    
    try {
      await login(identifier, password);
      // Ensure local state handles it before redirect
      setTimeout(() => navigate('/dashboard'), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', flexDirection: 'column', position: 'relative', direction: 'ltr' }}>
      <MatrixRain />
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,65,0.015) 2px,rgba(0,255,65,0.015) 4px)', pointerEvents: 'none', zIndex: 1 }} />
      <header style={{ position: 'relative', zIndex: 10, borderBottom: '1px solid #00ff4122', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.7)' }}>
        <Link to="/" style={{ textDecoration: 'none', color: '#00ff41', fontFamily: 'monospace', fontSize: 13, letterSpacing: 4 }}>SECURE_PAD</Link>
        <span className="mobile-hide" style={{ marginLeft: 'auto', color: '#1a5c2a', fontFamily: 'monospace', fontSize: 11 }}>{new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC</span>
      </header>
      <main style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 12px 40px', direction: 'ltr' }}>
        {children}
      </main>
    </div>
  );

  return shell(
    <div className="anim-fadeInUp" style={{
      width: '100%',
      maxWidth: 400,
      direction: 'ltr',
      background: 'rgba(2,2,2,0.95)',
      backdropFilter: 'blur(24px)',
      border: '1px solid #00ff4118',
      borderRadius: 4,
      padding: '30px 24px',
      boxShadow: '0 0 60px rgba(0,0,0,0.9), 0 0 120px rgba(0,0,0,0.6)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'monospace', color: '#00ff41', fontSize: 24, margin: '0 0 8px 0', letterSpacing: 4 }}>SYS_LOGIN</h2>
        <p style={{ fontFamily: 'monospace', color: '#1a6630', fontSize: 11, margin: 0 }}>Authenticate to access secure node.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontFamily: 'monospace', color: '#1a6630', fontSize: 13, pointerEvents: 'none' }}>id _</span>
          <input
            type="text"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            placeholder="Username or Email"
            autoFocus
            required
            style={{
              width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,0.9)', border: '1px solid #00ff4133', borderRadius: 2,
              padding: '10px 12px 10px 48px', fontFamily: 'monospace', fontSize: 13, color: '#7fffb0', outline: 'none', caretColor: '#00ff41',
            }}
          />
        </div>

        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontFamily: 'monospace', color: '#1a6630', fontSize: 13, pointerEvents: 'none' }}>pwd_</span>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            style={{
              width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,0.9)', border: '1px solid #00ff4133', borderRadius: 2,
              padding: '10px 12px 10px 48px', fontFamily: 'monospace', fontSize: 13, color: '#7fffb0', outline: 'none', caretColor: '#00ff41',
            }}
          />
        </div>

        {error && <div style={{ color: '#ff003c', fontFamily: 'monospace', fontSize: 11, textAlign: 'center' }}>⚠ {error}</div>}

        <button
          type="submit"
          disabled={loading || !identifier || !password}
          style={{
            marginTop: 8, padding: '12px 16px', background: 'rgba(0,255,65,0.1)', border: '1px solid #00ff4155', borderRadius: 2,
            color: '#00ff41', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, letterSpacing: 2,
            cursor: loading ? 'wait' : 'pointer', opacity: loading || !identifier || !password ? 0.5 : 1,
            boxShadow: identifier && password ? '0 0 10px #00ff4133' : 'none',
          }}
        >
          {loading ? '[ AUTHENTICATING… ]' : '[ LOGIN ]'}
        </button>
      </form>

      <div style={{ marginTop: 24, textAlign: 'center', fontFamily: 'monospace', fontSize: 11 }}>
        <span style={{ color: '#1a6630' }}>No clearance? </span>
        <Link to="/register" style={{ color: '#00ff41', textDecoration: 'none', borderBottom: '1px solid #00ff4155' }}>Register here.</Link>
      </div>
    </div>
  );
}
