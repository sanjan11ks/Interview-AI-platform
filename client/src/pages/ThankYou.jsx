import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ThankYou() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative' }}>
      <div className="gradient-mesh" />

      <div className={`fade-in`} style={{
        position: 'relative', zIndex: 1,
        textAlign: 'center', maxWidth: 480,
        opacity: visible ? 1 : 0, transition: 'opacity 0.6s',
      }}>
        {/* Animated checkmark */}
        <div style={{
          width: 100, height: 100,
          borderRadius: '50%',
          background: 'rgba(16,185,129,0.15)',
          border: '2px solid rgba(16,185,129,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 2rem',
          animation: 'fadeIn 0.6s ease both',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
            stroke="#10B981" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>
          Interview Complete
        </h2>

        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '0.75rem' }}>
          Your interview has been recorded and submitted.
        </p>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2.5rem' }}>
          Our team will review your assessment carefully. You'll hear back soon — thank you for your time.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn-secondary" onClick={() => navigate('/')}>
            Back to home
          </button>
        </div>

        <p style={{ marginTop: '2.5rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          Interview AI · For assessment purposes only
        </p>
      </div>
    </div>
  );
}
