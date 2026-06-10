import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Upload() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

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
    if (!allConsented) { setError('Please accept all consent items to proceed.'); return; }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('candidateName', name);
      formData.append('candidateEmail', email);
      formData.append('consentGiven', 'true');
      formData.append('resume', file);

      const res = await fetch('/api/upload/resume', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) { setError(data.error || 'Upload failed.'); setLoading(false); return; }

      navigate('/confirm', { state: { ...data, candidateName: name, candidateEmail: email } });
    } catch (err) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative' }}>
      <div className="gradient-mesh" />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Upload Your Resume</h2>
          <p style={{ color: 'var(--text-secondary)' }}>We'll analyse your background and tailor the interview to you.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Full Name</label>
            <input
              className="input"
              type="text"
              placeholder="Jane Smith"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Email Address</label>
            <input
              className="input"
              type="email"
              placeholder="jane@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Drop zone */}
          <div
            onClick={() => fileRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            style={{
              border: `2px dashed ${dragging ? 'var(--accent-blue)' : file ? 'var(--accent-green)' : 'var(--border-accent)'}`,
              borderRadius: 12,
              padding: '2.5rem 1rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragging ? 'rgba(59,130,246,0.06)' : file ? 'rgba(16,185,129,0.05)' : 'var(--bg-elevated)',
              transition: 'all 0.2s',
            }}
          >
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])} />

            {file ? (
              <>
                <p style={{ color: 'var(--accent-green)', fontWeight: 600, marginBottom: '0.3rem' }}>{file.name}</p>
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

          {/* ── Consent section ─────────────────────────────────────────── */}
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
          }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
              🔒 Consent & Data Processing
            </p>

            <ConsentItem checked={consentRecording} onChange={setConsentRecording}>
              I consent to my video and audio being <strong>recorded</strong> during this interview session for assessment purposes.
            </ConsentItem>

            <ConsentItem checked={consentAI} onChange={setConsentAI}>
              I understand my responses and resume will be <strong>processed by AI</strong> (Claude by Anthropic) to generate an interview assessment. No data is used to train AI models.
            </ConsentItem>

            <ConsentItem checked={consentPrivacy} onChange={setConsentPrivacy}>
              I have read and agree to the{' '}
              <button
                type="button"
                onClick={() => setShowPrivacy(v => !v)}
                style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', padding: 0, fontSize: 'inherit', textDecoration: 'underline' }}
              >
                Privacy Notice
              </button>
              , including how my data is stored and my right to request deletion.
            </ConsentItem>

            {/* Expandable privacy notice */}
            {showPrivacy && (
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '1rem',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
              }}>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.6rem' }}>Privacy Notice — Interview Platform</p>
                <p><strong>What we collect:</strong> Your name, email address, CV/resume text, video and audio recordings of your interview responses, and AI-generated assessments of those responses.</p>
                <br />
                <p><strong>Purpose:</strong> Data is collected solely to conduct and evaluate your interview. It is shared with the hiring organisation that sent you this link.</p>
                <br />
                <p><strong>AI processing:</strong> Your resume text and interview transcripts are sent to Anthropic's Claude API for analysis. Anthropic does not use this data to train its models. See <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)' }}>anthropic.com/privacy</a>.</p>
                <br />
                <p><strong>Retention:</strong> Your data is retained for as long as the hiring organisation requires it to make a hiring decision, typically no longer than 12 months.</p>
                <br />
                <p><strong>Your rights:</strong> You have the right to access, correct, or request deletion of your personal data at any time. Contact the organisation that sent you this interview link.</p>
                <br />
                <p><strong>Legal basis:</strong> Processing is based on your explicit consent provided below (GDPR Art. 6(1)(a)).</p>
              </div>
            )}
          </div>

          {error && <p style={{ color: '#EF4444', fontSize: '0.88rem', textAlign: 'center' }}>{error}</p>}

          <button className="btn-primary" type="submit" disabled={loading || !file || !allConsented} style={{ justifyContent: 'center' }}>
            {loading ? 'Analysing your background…' : 'Analyse & Continue'}
            {!loading && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </button>

          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: 1.5 }}>
            By proceeding you confirm your consent above. Your consent timestamp and IP address are logged for compliance purposes.
          </p>
        </form>
      </div>
    </div>
  );
}

function ConsentItem({ checked, onChange, children }) {
  return (
    <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ marginTop: '0.15rem', width: 16, height: 16, accentColor: 'var(--accent-blue)', flexShrink: 0 }}
      />
      <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{children}</span>
    </label>
  );
}
