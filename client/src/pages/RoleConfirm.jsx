import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ALL_ROLES = [
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'DevOps Engineer',
  'Cybersecurity Analyst', 'UI/UX Designer', 'Mobile Developer', 'Data Engineer',
  'ML/AI Engineer', 'SAP Consultant', 'Cloud Architect', 'QA Engineer',
  'Blockchain Developer', 'Embedded Systems Engineer',
];

export default function RoleConfirm() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [selectedRole, setSelectedRole] = useState(state?.detectedRole || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!state?.sessionId) {
    navigate('/upload');
    return null;
  }

  const confidence = Math.round((state.confidence || 0) * 100);

  async function handleStart() {
    if (!selectedRole) { setError('Please select a role.'); return; }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: state.sessionId,
          confirmedRole: selectedRole,
          inviteToken: state.inviteToken || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to start interview.'); setLoading(false); return; }

      navigate('/interview', {
        state: {
          sessionId: state.sessionId,
          role: selectedRole,
          questions: data.questions,
          candidateName: state.candidateName,
          inviteToken: state.inviteToken || null,
          branding: state.branding || null,
        },
      });
    } catch (err) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative' }}>
      <div className="gradient-mesh" />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 560 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>We detected your role</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Confirm or adjust before we begin.</p>
        </div>

        <div className="card-elevated" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
          {/* Detected role badge */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(6,182,212,0.2))',
              border: '1px solid rgba(59,130,246,0.4)',
              borderRadius: 12,
              padding: '0.75rem 2rem',
              marginBottom: '1rem',
            }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>
                Detected Role
              </p>
              <p style={{ color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '1.3rem' }}>
                {state.detectedRole}
              </p>
            </div>

            {/* Confidence bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', maxWidth: 300, margin: '0 auto' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {confidence}% match
              </span>
              <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3 }}>
                <div style={{
                  height: '100%',
                  width: `${confidence}%`,
                  background: `linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))`,
                  borderRadius: 3,
                }} />
              </div>
            </div>
          </div>

          {/* Detected skills */}
          {state.detectedSkills?.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.6rem', textAlign: 'center' }}>
                Skills detected
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
                {state.detectedSkills.map(skill => (
                  <span key={skill} className="pill pill-blue">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {state.summary && (
            <div style={{
              background: 'var(--bg-primary)',
              borderRadius: 10,
              padding: '0.875rem 1rem',
              marginBottom: '1.5rem',
            }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                {state.summary}
              </p>
            </div>
          )}

          {/* Role override */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              This doesn't feel right? Select your actual role
            </label>
            <select
              className="input"
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              {ALL_ROLES.map(r => (
                <option key={r} value={r} style={{ background: '#1A2234' }}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <p style={{ color: '#EF4444', fontSize: '0.88rem', textAlign: 'center', marginBottom: '1rem' }}>{error}</p>}

        <button
          className="btn-primary"
          onClick={handleStart}
          disabled={loading}
          style={{ width: '100%', justifyContent: 'center', fontSize: '1.05rem', padding: '0.9rem' }}
        >
          {loading ? 'Generating your questions…' : 'Begin Interview'}
          {!loading && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          )}
        </button>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem' }}>
          You'll be asked 6 questions. Each has a time limit. Take a breath — you've got this.
        </p>
      </div>
    </div>
  );
}
