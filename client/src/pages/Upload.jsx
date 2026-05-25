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

          {error && <p style={{ color: '#EF4444', fontSize: '0.88rem', textAlign: 'center' }}>{error}</p>}

          <button className="btn-primary" type="submit" disabled={loading || !file} style={{ justifyContent: 'center' }}>
            {loading ? 'Analysing your background…' : 'Analyse & Continue'}
            {!loading && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
