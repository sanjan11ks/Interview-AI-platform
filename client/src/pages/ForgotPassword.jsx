import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError(''); setMsg('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); }
      else { setMsg(data.message); }
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="gradient-mesh" />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="https://cdn.prod.website-files.com/66da74c4b22037be1899acf3/66e4088b46d50c9bc1897004_dasro-logo.png"
            alt="Dasro" style={{ height: 36, marginBottom: '1.5rem' }} />
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Forgot your password?</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Enter your email and we'll send you a reset link.</p>
        </div>

        {msg ? (
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: '#10B981', marginBottom: '1rem' }}>✅ {msg}</p>
            <button className="btn-secondary" onClick={() => navigate('/admin')}>Back to Login</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input className="input" type="email" placeholder="your@email.com" value={email}
              onChange={e => setEmail(e.target.value)} required />
            {error && <p style={{ color: '#EF4444', fontSize: '0.85rem', textAlign: 'center' }}>{error}</p>}
            <button className="btn-primary" type="submit" disabled={loading} style={{ justifyContent: 'center' }}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => navigate('/admin')} style={{ justifyContent: 'center' }}>
              Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
