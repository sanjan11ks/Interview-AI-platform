import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

/**
 * Candidate lands here from an invite link: /invite/:token
 * Fetches branding from the server, then presents the branded upload form
 * with GDPR consent checkboxes.
 */
export default function InviteLanding() {
  const { token } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [branding, setBranding] = useState({ companyName: 'Interview AI', brandColor: '#3B82F6', logoPath: null });
  const [brandingLoaded, setBrandingLoaded] = useState(false);
  const [brandingError, setBrandingError] = useState(false);

  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Consent checkboxes
  const [consentRecording, setConsentRecording] = useState(false);
  const [consentAI, setConsentAI] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const allConsented = consentRecording && consentAI && consentPrivacy;

  // Fetch branding for this invite token
  useEffect(() => {
    async function loadBranding() {
      try {
        const res = await fetch(`/api/branding/${token}`);
        if (!res.ok) { setBrandingError(true); return; }
        const data = await res.json();
        setBranding(data);
      } catch {
        setBrandingError(true);
      } finally {
        setBrandingLoaded(true);
      }
    }
    loadBranding();
  }, [token]);

  // Apply brand color as CSS variable
  useEffect(() => {
    if (branding.brandColor) {
      document.documentElement.style.setProperty('--brand-color', branding.brandColor);
    }
  }, [branding.brandColor]);

  function handleFile(f) {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
      setError('Only PDF, DOC, DOCX, and TXT files are accepted.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('File must be smaller than 5 MB.');
      return;
    }
    setError('');
    setFile(f);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file || !name || !email) { setError('All fields are required.'); return; }
    if (!allConsented) { setError('Please tick all three consent boxes to continue.'); return; }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      // ⚠ Text fields MUST come before the file (multer reads body in order)
      formData.append('candidateName', name);
      formData.append('candidateEmail', email);
      formData.append('inviteToken', token);
      formData.append('consentGiven', 'true');
      formData.append('resume', file); // file last

      const res = await fetch('/api/upload/resume', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) { setError(data.error || 'Upload failed.'); setLoading(false); return; }

      navigate('/confirm', {
        state: { ...data, candidateName: name, candidateEmail: email, inviteToken: token, branding },
      });
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  if (!brandingLoaded) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    );
  }

  if (brandingError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ color: '#EF4444', fontSize: '1.1rem' }}>Invalid or expired invite link.</p>
        <button className="btn-secondary" onClick={() => navigate('/')}>Go to home</button>
      </div>
    );
  }

  const accentColor = branding.brandColor || '#3B82F6';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div className="gradient-mesh" />

      {/* Branded header */}
      <header style={{
        position: 'relative', zIndex: 1,
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
        padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem',
      }}>
        {branding.logoUrl && (
          <img src={branding.logoUrl} alt="logo" style={{ height: 36, objectFit: 'contain' }} />
        )}
        <span style={{ color: accentColor, fontWeight: 700, fontSize: '1.1rem' }}>
          {branding.companyName}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>· Technical Interview</span>
      </header>

      {/* Upload form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%', maxWidth: 540 }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Upload Your Resume
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              {branding.companyName} will analyse your background and tailor the interview to you.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Full Name</label>
              <input className="input" type="text" placeholder="Jane Smith" value={name}
                onChange={e => setName(e.target.value)} required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Email Address</label>
              <input className="input" type="email" placeholder="jane@example.com" value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>

            {/* Drop zone */}
            <div onClick={() => fileRef.current.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              style={{
                border: `2px dashed ${dragging ? accentColor : file ? '#10B981' : 'var(--border-accent)'}`,
                borderRadius: 12, padding: '2.5rem 1rem', textAlign: 'center', cursor: 'pointer',
                background: dragging ? `${accentColor}10` : file ? 'rgba(16,185,129,0.05)' : 'var(--bg-elevated)',
                transition: 'all 0.2s',
              }}>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])} />
              {file ? (
                <>
                  <p style={{ color: '#10B981', fontWeight: 600, marginBottom: '0.3rem' }}>{file.name}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{(file.size / 1024).toFixed(0)} KB — click to change</p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
                  <p style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Drag & drop your resume here</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>PDF, DOC, DOCX or TXT · max 5 MB</p>
                </>
              )}
            </div>

            {/* ── Consent section ───────────────────────────────────────── */}
            <div style={{
              background: 'rgba(59,130,246,0.07)',
              border: '1.5px solid rgba(59,130,246,0.35)',
              borderRadius: 12,
              padding: '1.25rem 1.25rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.9rem',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1rem' }}>🔒</span>
                <span style={{ fontSize: '0.82rem', color: '#93C5FD', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Required Consents — please tick all three
                </span>
              </div>

              <ConsentItem checked={consentRecording} onChange={setConsentRecording}>
                I consent to my video and audio being <strong style={{ color: '#F9FAFB' }}>recorded</strong> during this interview session for assessment purposes.
              </ConsentItem>

              <ConsentItem checked={consentAI} onChange={setConsentAI}>
                I understand my responses and resume will be <strong style={{ color: '#F9FAFB' }}>processed by AI</strong> (Claude by Anthropic) to generate an interview assessment. No data is used to train AI models.
              </ConsentItem>

              <ConsentItem checked={consentPrivacy} onChange={setConsentPrivacy}>
                I have read and agree to the{' '}
                <button
                  type="button"
                  onClick={() => setShowPrivacy(v => !v)}
                  style={{ background: 'none', border: 'none', color: '#60A5FA', cursor: 'pointer', padding: 0, fontSize: 'inherit', textDecoration: 'underline', fontWeight: 600 }}
                >
                  Privacy Notice ↓
                </button>
                , including how my data is stored and my right to request deletion.
              </ConsentItem>

              {/* Expandable privacy notice */}
              {showPrivacy && (
                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: 8,
                  padding: '1rem',
                  fontSize: '0.78rem',
                  color: '#D1D5DB',
                  lineHeight: 1.75,
                }}>
                  <p style={{ fontWeight: 700, color: '#F9FAFB', marginBottom: '0.75rem' }}>Privacy Notice — {branding.companyName} Interview Platform</p>
                  <p><strong style={{ color: '#F9FAFB' }}>What we collect:</strong> Your name, email, CV/resume text, video/audio recordings of your interview responses, and AI-generated assessments.</p>
                  <br />
                  <p><strong style={{ color: '#F9FAFB' }}>Purpose:</strong> Data is used solely to conduct and evaluate your interview, then shared with {branding.companyName}.</p>
                  <br />
                  <p><strong style={{ color: '#F9FAFB' }}>AI processing:</strong> Resume text and interview transcripts are sent to Anthropic's Claude API for analysis. Anthropic does not use your data to train models. See <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#60A5FA' }}>anthropic.com/privacy</a>.</p>
                  <br />
                  <p><strong style={{ color: '#F9FAFB' }}>Retention:</strong> Your data is retained for as long as {branding.companyName} requires, typically no longer than 12 months.</p>
                  <br />
                  <p><strong style={{ color: '#F9FAFB' }}>Your rights:</strong> You have the right to access, correct, or request deletion of your data at any time. Contact {branding.companyName} directly.</p>
                  <br />
                  <p><strong style={{ color: '#F9FAFB' }}>Legal basis:</strong> Processing is based on your explicit consent provided below (GDPR Art. 6(1)(a)).</p>
                </div>
              )}

              {/* Progress dots */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', paddingTop: '0.25rem', borderTop: '1px solid rgba(59,130,246,0.15)' }}>
                {[consentRecording, consentAI, consentPrivacy].map((c, i) => (
                  <span key={i} style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: c ? '#10B981' : 'rgba(255,255,255,0.2)',
                    transition: 'background 0.2s',
                  }} />
                ))}
                <span style={{ fontSize: '0.75rem', color: allConsented ? '#6EE7B7' : '#9CA3AF', marginLeft: 4 }}>
                  {allConsented
                    ? '✓ All consents given — you can continue'
                    : `${[consentRecording, consentAI, consentPrivacy].filter(Boolean).length} of 3 consents given`}
                </span>
              </div>
            </div>

            {error && <p style={{ color: '#EF4444', fontSize: '0.88rem', textAlign: 'center' }}>{error}</p>}

            <button type="submit" disabled={loading || !file || !allConsented}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                background: loading || !file || !allConsented ? 'var(--bg-elevated)' : accentColor,
                color: loading || !file || !allConsented ? 'var(--text-muted)' : '#fff',
                border: 'none', borderRadius: 10, padding: '0.9rem 1.5rem',
                fontSize: '1rem', fontWeight: 600,
                cursor: loading || !file || !allConsented ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}>
              {loading ? 'Analysing your background…' : 'Analyse & Continue →'}
            </button>

            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: 1.5 }}>
              By proceeding you confirm your consent above. Your consent timestamp and IP address are logged for compliance purposes.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function ConsentItem({ checked, onChange, children }) {
  return (
    <label style={{
      display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer',
      padding: '0.6rem 0.75rem',
      borderRadius: 8,
      background: checked ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
      border: `1.5px solid ${checked ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`,
      transition: 'all 0.2s',
    }}>
      {/* Custom checkbox */}
      <div style={{
        width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
        background: checked ? '#10B981' : 'transparent',
        border: `2px solid ${checked ? '#10B981' : '#6B7280'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        {checked && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
      />
      <span style={{ fontSize: '0.84rem', color: checked ? '#D1FAE5' : '#D1D5DB', lineHeight: 1.65 }}>{children}</span>
    </label>
  );
}
