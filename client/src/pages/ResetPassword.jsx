import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setError('Invalid reset link. Please request a new one.'); }
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }

    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); }
      else { setSuccess(true); }
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
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Set new password</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Choose a strong password for your account.</p>
        </div>

        {success ? (
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: '#10B981', marginBottom: '1rem' }}>✅ Password updated! You can now log in.</p>
            <button className="btn-primary" onClick={() => navigate('/admin')} style={{ justifyContent: 'center' }}>
              Go to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>New Password</label>
              <input className="input" type="password" placeholder="Min. 8 characters" value={password}
                onChange={e => setPassword(e.target.value)} required minLength={8} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Confirm Password</label>
              <input className="input" type="password" placeholder="Repeat password" value={confirm}
                onChange={e => setConfirm(e.target.value)} required minLength={8} />
            </div>
            {error && <p style={{ color: '#EF4444', fontSize: '0.85rem', textAlign: 'center' }}>{error}</p>}
            <button className="btn-primary" type="submit" disabled={loading || !token} style={{ justifyContent: 'center' }}>
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
