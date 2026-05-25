import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

/**
 * Candidate lands here from an invite link: /invite/:token
 * Fetches branding from the server, then presents the branded upload form.
 * Passes the invite token through to the interview session.
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

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('candidateName', name);
      formData.append('candidateEmail', email);
      formData.append('inviteToken', token); // ← associate session with admin

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
        <div style={{ width: '100%', maxWidth: 520 }}>
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

            {error && <p style={{ color: '#EF4444', fontSize: '0.88rem', textAlign: 'center' }}>{error}</p>}

            <button type="submit" disabled={loading || !file}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                background: loading || !file ? 'var(--bg-elevated)' : accentColor,
                color: loading || !file ? 'var(--text-muted)' : '#fff',
                border: 'none', borderRadius: 10, padding: '0.9rem 1.5rem',
                fontSize: '1rem', fontWeight: 600, cursor: loading || !file ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}>
              {loading ? 'Analysing your background…' : 'Analyse & Continue →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
