import { useNavigate } from 'react-router-dom';

const FEATURES = [
  {
    icon: '🎯',
    title: 'Resume-Tailored Questions',
    desc: 'Every interview is uniquely generated based on the candidate\'s background and the role requirements.',
  },
  {
    icon: '🎥',
    title: 'Video-Recorded Sessions',
    desc: 'Full video and audio capture per question, stored securely and accessible only to your team.',
  },
  {
    icon: '🛡️',
    title: 'Anti-Cheat Proctoring',
    desc: 'Fullscreen enforcement, tab-switch detection, and automatic flagging keep sessions honest.',
  },
  {
    icon: '📊',
    title: 'Instant AI Scoring',
    desc: 'Structured scores, competency analysis, and a hiring recommendation generated immediately after each session.',
  },
  {
    icon: '⚖️',
    title: 'Compliance Ready',
    desc: 'GDPR-compliant consent flow, timestamped audit trail, and transparent AI processing disclosure.',
  },
  {
    icon: '🔗',
    title: 'Shareable Invite Links',
    desc: 'Send candidates a branded link — no accounts, no friction. White-label with your company identity.',
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.25rem 2.5rem',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,15,28,0.85)',
        backdropFilter: 'blur(12px)',
      }}>
        <img
          src="https://cdn.prod.website-files.com/66da74c4b22037be1899acf3/66e4088b46d50c9bc1897004_dasro-logo.png"
          alt="Dasro"
          style={{ height: 32, objectFit: 'contain' }}
        />
        <button
          className="btn-primary"
          onClick={() => navigate('/admin')}
          style={{ fontSize: '0.9rem', padding: '0.55rem 1.5rem' }}
        >
          Admin Login
        </button>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="gradient-mesh" />
        <div style={{
          position: 'relative', zIndex: 1,
          maxWidth: 760, margin: '0 auto',
          padding: '6rem 2rem 5rem',
          textAlign: 'center',
        }}>
          <span style={{
            display: 'inline-block',
            background: 'rgba(59,130,246,0.12)',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: 100,
            padding: '0.35rem 1rem',
            fontSize: '0.8rem',
            color: 'var(--accent-blue)',
            fontWeight: 600,
            letterSpacing: '0.05em',
            marginBottom: '1.75rem',
            textTransform: 'uppercase',
          }}>
            Intelligent Hiring Platform
          </span>

          <h1 style={{
            fontSize: 'clamp(2.4rem, 5.5vw, 3.75rem)',
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, #F9FAFB 30%, #93C5FD 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Screen smarter.<br />Hire with confidence.
          </h1>

          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '1.15rem',
            lineHeight: 1.75,
            marginBottom: '2.75rem',
            maxWidth: 560,
            margin: '0 auto 2.75rem',
          }}>
            Dasro's interview platform automates technical screening with AI-generated questions, video recording, and instant scoring — so your team focuses on the final decision, not the process.
          </p>

          <button
            className="btn-primary"
            onClick={() => navigate('/admin')}
            style={{ fontSize: '1.05rem', padding: '0.9rem 2.75rem' }}
          >
            Go to Admin Dashboard
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>

          {/* Trust bar */}
          <div style={{
            marginTop: '3.5rem',
            display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap',
          }}>
            {[
              { icon: '🔒', label: 'GDPR Compliant' },
              { icon: '🎥', label: 'Video Proctored' },
              { icon: '⚡', label: 'Results in Minutes' },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <span>{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--border), transparent)', margin: '0 2rem' }} />

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '5rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Everything your hiring team needs
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            From invite link to scored report — fully automated.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.25rem',
        }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '1.75rem',
              transition: 'border-color 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ fontSize: '1.75rem', marginBottom: '0.85rem' }}>{f.icon}</div>
              <h3 style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '1rem' }}>{f.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA strip ───────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(6,182,212,0.06))',
        border: '1px solid rgba(59,130,246,0.15)',
        borderRadius: 20,
        margin: '0 2rem 5rem',
        padding: '3.5rem 2rem',
        textAlign: 'center',
        maxWidth: 860,
        marginLeft: 'auto',
        marginRight: 'auto',
      }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          Ready to start screening?
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Log in to your admin dashboard to create invite links, review candidates, and access video recordings.
        </p>
        <button
          className="btn-primary"
          onClick={() => navigate('/admin')}
          style={{ fontSize: '1rem', padding: '0.85rem 2.5rem' }}
        >
          Open Admin Dashboard
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '2rem 2.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <img
          src="https://cdn.prod.website-files.com/66da74c4b22037be1899acf3/66e4088b46d50c9bc1897004_dasro-logo.png"
          alt="Dasro"
          style={{ height: 24, opacity: 0.7 }}
        />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          © {new Date().getFullYear()} Dasro. All rights reserved. · Candidates access via invite link only.
        </p>
      </footer>
    </div>
  );
}
