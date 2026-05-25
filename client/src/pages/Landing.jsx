import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="gradient-mesh" />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 680 }}>
        {/* Logo mark */}
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))',
          margin: '0 auto 2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 40px rgba(59,130,246,0.4)',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>

        <p style={{ color: 'var(--accent-cyan)', fontWeight: 600, letterSpacing: '0.12em', fontSize: '0.85rem', marginBottom: '1rem', textTransform: 'uppercase' }}>
          Interview AI
        </p>

        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 4rem)',
          fontWeight: 700,
          lineHeight: 1.1,
          marginBottom: '1.5rem',
          background: 'linear-gradient(135deg, #F9FAFB 0%, #93C5FD 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Technical Interview.<br />Reimagined.
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', lineHeight: 1.7, marginBottom: '2.5rem' }}>
          Upload your resume. Answer questions your way.<br />Let your skills speak.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => navigate('/upload')} style={{ fontSize: '1.05rem', padding: '0.9rem 2.5rem' }}>
            Start Interview
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
          <button className="btn-secondary" onClick={() => navigate('/admin')} style={{ fontSize: '1.05rem', padding: '0.9rem 2.5rem' }}>
            Admin Dashboard
          </button>
        </div>

        <div style={{ marginTop: '3rem', display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {['Powered by AI', 'Recorded Securely', 'For Assessment Only'].map(label => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-cyan)', display: 'inline-block' }} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
