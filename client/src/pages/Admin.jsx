import { useState, useEffect, useRef } from 'react';
import ScoreGauge from '../components/ScoreGauge';
import ReportCard from '../components/ReportCard';

const STATUS_COLOURS = {
  analysed: 'pill-green',
  completed: 'pill-cyan',
  in_progress: 'pill-amber',
  pending: 'pill-blue',
};

// ── Helper: build auth headers from stored token ──────────────────────────────
function authHeaders(token) {
  // If token looks like a JWT (has two dots), use Bearer; otherwise legacy x-admin-token
  if (token && token.split('.').length === 3) {
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  }
  return { 'x-admin-token': token, 'Content-Type': 'application/json' };
}

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem('adminToken') || '');
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordLegacy, setPasswordLegacy] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loginError, setLoginError] = useState('');

  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState('sessions');
  const [loading, setLoading] = useState(false);

  // Settings tab state
  const [apiKeyMasked, setApiKeyMasked] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [settingsMsg, setSettingsMsg] = useState('');
  const [settingsMsgType, setSettingsMsgType] = useState('');

  // Branding state
  const [branding, setBranding] = useState({ companyName: '', brandColor: '#3B82F6', behavioralPosition: 'start', logoUrl: null });
  const [brandingMsg, setBrandingMsg] = useState('');
  const [logoFile, setLogoFile] = useState(null);

  // Invite links state
  const [invites, setInvites] = useState([]);
  const [inviteLabel, setInviteLabel] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');

  // Storage debug state
  const [storageDebug, setStorageDebug] = useState(null);
  const [storageLoading, setStorageLoading] = useState(false);

  // Admin info
  const [adminInfo, setAdminInfo] = useState(null);

  useEffect(() => {
    if (token) {
      fetchSessions();
      fetchSettings();
      fetchAdminInfo();
    }
  }, [token]);

  async function fetchAdminInfo() {
    try {
      const res = await fetch('/api/auth/me', { headers: authHeaders(token) });
      if (res.status === 401 || res.status === 404) {
        // Token is stale (DB was reset) — force logout
        sessionStorage.removeItem('adminToken');
        setToken('');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setAdminInfo(data);
        if (!data.isLegacy) {
          setBranding({
            companyName: data.companyName || '',
            brandColor: data.brandColor || '#3B82F6',
            behavioralPosition: data.behavioralPosition || 'start',
            logoUrl: data.logoUrl || null,
          });
          fetchInvites();
        }
      }
    } catch {}
  }

  async function fetchSettings() {
    try {
      const res = await fetch('/api/admin/settings', { headers: authHeaders(token) });
      const data = await res.json();
      if (res.ok) setApiKeyMasked(data.apiKeyMasked || '');
    } catch {}
  }

  async function saveApiKey() {
    setSettingsMsg('');
    if (!apiKeyInput.trim()) { setSettingsMsg('Please enter an API key.'); setSettingsMsgType('error'); return; }
    try {
      const res = await fetch('/api/admin/settings/api-key', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setSettingsMsg(data.error || 'Failed to save.'); setSettingsMsgType('error'); return; }
      setApiKeyMasked(data.apiKeyMasked);
      setApiKeyInput('');
      setSettingsMsg('API key saved successfully!');
      setSettingsMsgType('success');
    } catch {
      setSettingsMsg('Network error.'); setSettingsMsgType('error');
    }
  }

  // ── Legacy password login ─────────────────────────────────────────────────
  async function loginLegacy() {
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordLegacy }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.error || 'Invalid password.'); return; }
      sessionStorage.setItem('adminToken', data.token);
      setToken(data.token);
    } catch { setLoginError('Network error.'); }
  }

  // ── Email+password login ──────────────────────────────────────────────────
  async function loginEmail() {
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.error || 'Login failed.'); return; }
      sessionStorage.setItem('adminToken', data.token);
      setToken(data.token);
    } catch { setLoginError('Network error.'); }
  }

  // ── Register new admin account ────────────────────────────────────────────
  async function register() {
    setLoginError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, companyName }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.error || 'Registration failed.'); return; }
      sessionStorage.setItem('adminToken', data.token);
      setToken(data.token);
    } catch { setLoginError('Network error.'); }
  }

  async function fetchSessions() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/sessions', { headers: authHeaders(token) });
      const data = await res.json();
      if (res.ok) setSessions(data.sessions || []);
    } catch {}
    setLoading(false);
  }

  async function viewSession(id) {
    setSelected(id);
    setTab('detail');
    setDetail(null);
    try {
      const res = await fetch(`/api/admin/session/${id}`, { headers: authHeaders(token) });
      const data = await res.json();
      if (res.ok) setDetail(data);
    } catch {}
  }

  function downloadReport(sessionId) {
    const t = token;
    const isJwt = t.split('.').length === 3;
    if (isJwt) {
      // For JWT, open with Authorization header isn't possible via window.open;
      // use a hidden link with fetch + blob instead
      fetch(`/api/admin/report/${sessionId}/download`, { headers: authHeaders(t) })
        .then(r => r.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'report.pdf'; a.click();
          URL.revokeObjectURL(url);
        });
    } else {
      window.open(`/api/admin/report/${sessionId}/download?token=${t}`, '_blank');
    }
  }

  function videoUrl(sessionId, videoFile) {
    const t = token;
    const isJwt = t.split('.').length === 3;
    // For JWT we'll fetch via JS; return the raw URL for legacy token (query param)
    if (!isJwt) return `/api/videos/${sessionId}/${videoFile}?token=${t}`;
    return `/api/videos/${sessionId}/${videoFile}`;
  }

  // ── Branding ──────────────────────────────────────────────────────────────
  async function saveBranding() {
    setBrandingMsg('');
    try {
      const formData = new FormData();
      formData.append('companyName', branding.companyName);
      formData.append('brandColor', branding.brandColor);
      formData.append('behavioralPosition', branding.behavioralPosition);
      if (logoFile) formData.append('logo', logoFile);

      const headers = {};
      const t = token;
      if (t.split('.').length === 3) headers['Authorization'] = `Bearer ${t}`;
      else headers['x-admin-token'] = t;

      const res = await fetch('/api/admin/branding', { method: 'POST', headers, body: formData });
      const data = await res.json();
      if (!res.ok) { setBrandingMsg(data.error || 'Failed.'); return; }
      setBranding({ companyName: data.companyName, brandColor: data.brandColor, behavioralPosition: data.behavioralPosition, logoUrl: data.logoUrl || null });
      setBrandingMsg('Branding saved!');
      setLogoFile(null);
    } catch { setBrandingMsg('Network error.'); }
  }

  // ── Invite links ──────────────────────────────────────────────────────────
  async function fetchInvites() {
    try {
      const res = await fetch('/api/admin/invites', { headers: authHeaders(token) });
      const data = await res.json();
      if (res.ok) setInvites(data.invites || []);
    } catch {}
  }

  async function createInvite() {
    setInviteMsg('');
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ label: inviteLabel }),
      });
      const data = await res.json();
      if (!res.ok) { setInviteMsg(data.error || 'Failed.'); return; }
      setInvites(prev => [data.invite, ...prev]);
      setInviteLabel('');
      setInviteMsg('Invite link created!');
    } catch { setInviteMsg('Network error.'); }
  }

  async function deleteInvite(id) {
    try {
      await fetch(`/api/admin/invites/${id}`, { method: 'DELETE', headers: authHeaders(token) });
      setInvites(prev => prev.filter(i => i.id !== id));
    } catch {}
  }

  function copyInvite(token) {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    setInviteMsg('Copied to clipboard!');
    setTimeout(() => setInviteMsg(''), 2000);
  }

  function gradeClass(score) {
    if (score >= 80) return 'score-a';
    if (score >= 60) return 'score-b';
    if (score >= 40) return 'score-c';
    return 'score-d';
  }

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative' }}>
        <div className="gradient-mesh" />
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, textAlign: 'center', marginBottom: '0.5rem' }}>Admin Login</h2>

          {/* Mode switcher */}
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: 8, padding: 4, marginBottom: '1.5rem' }}>
            {[{ id: 'login', label: 'Login' }, { id: 'register', label: 'Create Account' }].map(m => (
              <button key={m.id} onClick={() => { setAuthMode(m.id); setLoginError(''); }}
                style={{
                  flex: 1, padding: '0.5rem', fontSize: '0.88rem', borderRadius: 6, cursor: 'pointer',
                  background: authMode === m.id ? 'var(--accent-blue)' : 'transparent',
                  color: authMode === m.id ? '#fff' : 'var(--text-muted)',
                  border: 'none', fontFamily: 'var(--font-display)', fontWeight: authMode === m.id ? 600 : 400,
                  transition: 'all 0.15s',
                }}>
                {m.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {authMode === 'login' && (
              <>
                <input className="input" type="email" placeholder="Email address"
                  value={email} onChange={e => setEmail(e.target.value)} />
                <input className="input" type="password" placeholder="Password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loginEmail()} />
                <button className="btn-primary" onClick={loginEmail} style={{ justifyContent: 'center' }}>Login</button>
              </>
            )}

            {authMode === 'register' && (
              <>
                <input className="input" type="email" placeholder="Email address"
                  value={email} onChange={e => setEmail(e.target.value)} />
                <input className="input" type="password" placeholder="Password (8+ characters)"
                  value={password} onChange={e => setPassword(e.target.value)} />
                <input className="input" type="text" placeholder="Company name (optional)"
                  value={companyName} onChange={e => setCompanyName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && register()} />
                <button className="btn-primary" onClick={register} style={{ justifyContent: 'center' }}>Create Account</button>
              </>
            )}

            {loginError && <p style={{ color: '#EF4444', fontSize: '0.85rem', textAlign: 'center' }}>{loginError}</p>}
          </div>
        </div>
      </div>
    );
  }

  const isMultiAdmin = adminInfo && !adminInfo.isLegacy;
  const tabs = ['sessions', 'detail', 'settings'];
  if (isMultiAdmin) tabs.push('branding', 'invites');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <header style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {branding.logoUrl && (
          <img src={branding.logoUrl} alt="logo" style={{ height: 32, objectFit: 'contain' }} />
        )}
        <span style={{ color: branding.brandColor || 'var(--accent-cyan)', fontWeight: 700 }}>
          {branding.companyName || 'Interview AI'}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Admin Dashboard</span>
        {adminInfo && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
            · {adminInfo.email}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button className="btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
          onClick={() => { sessionStorage.removeItem('adminToken'); setToken(''); setAdminInfo(null); }}>
          Log out
        </button>
      </header>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '0 2rem', background: 'var(--bg-card)', display: 'flex', gap: '0.25rem', overflowX: 'auto' }}>
        {tabs.map(t => {
          const labels = { sessions: 'Sessions', detail: selected ? 'Detail' : 'Detail', settings: 'Settings', branding: 'Branding', invites: 'Invite Links' };
          const disabled = t === 'detail' && !selected;
          return (
            <button key={t} onClick={() => setTab(t)} disabled={disabled}
              style={{
                padding: '0.75rem 1.1rem', background: 'none', border: 'none',
                borderBottom: tab === t ? '2px solid var(--accent-blue)' : '2px solid transparent',
                color: tab === t ? 'var(--accent-blue)' : 'var(--text-muted)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-display)', fontSize: '0.88rem',
                fontWeight: tab === t ? 600 : 400, whiteSpace: 'nowrap',
              }}>
              {labels[t]}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, padding: '2rem', maxWidth: 1200, margin: '0 auto', width: '100%' }}>

        {/* ── Sessions list ─────────────────────────────────────────────── */}
        {tab === 'sessions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Sessions ({sessions.length})</h3>
              <button className="btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={fetchSessions}>Refresh</button>
            </div>

            {loading && <p style={{ color: 'var(--text-muted)' }}>Loading…</p>}
            {!loading && sessions.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No sessions yet. Once candidates complete interviews, they'll appear here.
              </div>
            )}

            {sessions.map(s => (
              <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontWeight: 600, marginBottom: '0.2rem' }}>
                    {s.candidate_name || 'Unknown'}
                    {s.flagged ? <span style={{ color: '#EF4444', fontSize: '0.78rem', marginLeft: '0.5rem' }}>🚨 FLAGGED</span> : null}
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{s.candidate_email}</p>
                </div>
                <div style={{ minWidth: 160 }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{s.confirmed_role || '—'}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{new Date(s.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`pill ${STATUS_COLOURS[s.status] || 'pill-blue'}`}>{s.status}</span>
                {s.violation_count > 0 && (
                  <span style={{ fontSize: '0.78rem', color: '#F59E0B', fontFamily: 'var(--font-mono)' }}>
                    ⚠ {s.violation_count} violation{s.violation_count !== 1 ? 's' : ''}
                  </span>
                )}
                {s.total_score != null && (
                  <span className={gradeClass(s.total_score)} style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', minWidth: 60, textAlign: 'center' }}>
                    {Math.round(s.total_score)}/100
                  </span>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-secondary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }} onClick={() => viewSession(s.id)}>View</button>
                  {s.report_path && (
                    <button className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }} onClick={() => downloadReport(s.id)}>PDF</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Session detail ────────────────────────────────────────────── */}
        {tab === 'detail' && detail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Candidate header */}
            <div className="card-elevated" style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem', flexWrap: 'wrap', padding: '2rem' }}>
              <ScoreGauge score={detail.finalAnalysis?.overall_score || 0} grade={detail.finalAnalysis?.grade || '?'} size={120} />
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  {detail.session?.candidate_name}
                  {detail.session?.flagged ? <span style={{ color: '#EF4444', fontSize: '0.9rem', marginLeft: '0.75rem' }}>🚨 FLAGGED</span> : null}
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  {detail.session?.confirmed_role} · {detail.session?.experience_level}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem' }}>
                  {detail.session?.candidate_email} · {new Date(detail.session?.created_at).toLocaleString()}
                </p>
                {detail.finalAnalysis?.recommended_next_step && (
                  <span className="pill pill-blue">{detail.finalAnalysis.recommended_next_step}</span>
                )}
              </div>
              {detail.session?.report_path && (
                <button className="btn-primary" style={{ padding: '0.6rem 1.25rem' }} onClick={() => downloadReport(detail.session.id)}>
                  Download PDF
                </button>
              )}
            </div>

            {/* Violations panel */}
            {detail.violations && detail.violations.length > 0 && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
                <h3 style={{ fontWeight: 600, marginBottom: '0.75rem', color: '#EF4444', fontSize: '0.95rem' }}>
                  🚨 Anti-Cheat Violations ({detail.violations.length})
                </h3>
                {detail.violations.map((v, i) => (
                  <div key={v.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                      {new Date(v.occurred_at).toLocaleTimeString()}
                    </span>
                    <span style={{ color: '#F87171', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {v.violation_type.replace(/_/g, ' ')}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>{v.details}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Executive summary */}
            {detail.finalAnalysis?.executive_summary && (
              <div className="card">
                <h3 style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--accent-cyan)' }}>Executive Summary</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{detail.finalAnalysis.executive_summary}</p>
              </div>
            )}

            {/* Competency scores */}
            {detail.finalAnalysis?.competency_scores && (
              <div className="card">
                <h3 style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--accent-cyan)' }}>Competency Scores</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {Object.entries(detail.finalAnalysis.competency_scores).map(([key, val]) => (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                        <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)' }}>{val}</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${val}%`, background: 'var(--accent-blue)', borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths + development */}
            {(detail.finalAnalysis?.top_strengths?.length > 0 || detail.finalAnalysis?.development_areas?.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="card">
                  <h4 style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--accent-green)' }}>Top Strengths</h4>
                  {detail.finalAnalysis.top_strengths?.map((s, i) => (
                    <p key={i} style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.4rem' }}>• {s}</p>
                  ))}
                </div>
                <div className="card">
                  <h4 style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--accent-amber)' }}>Development Areas</h4>
                  {detail.finalAnalysis.development_areas?.map((a, i) => (
                    <p key={i} style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.4rem' }}>• {a}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Q&A accordion with video player */}
            <div>
              <h3 style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--accent-cyan)' }}>Question-by-Question Analysis</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {detail.qa?.map((qa, i) => (
                  <div key={qa.id}>
                    <ReportCard qa={{ question: qa, answer: { ...qa.answer, analysis: qa.analysis } }} index={i} />
                    <div style={{ margin: '0.5rem 0 0.25rem', padding: '0.75rem 1rem', background: 'var(--bg-elevated)', borderRadius: '0 0 12px 12px', borderTop: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>📹 Interview Recording</p>
                      {qa.answer?.videoFile
                        ? <VideoPlayer sessionId={detail.session?.id} videoFile={qa.answer.videoFile} token={token} />
                        : <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No recording saved for this question.</p>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hiring note */}
            {detail.finalAnalysis?.hiring_note && (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
                <p style={{ color: '#F59E0B', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                  Private Hiring Note
                </p>
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.7 }}>{detail.finalAnalysis.hiring_note}</p>
              </div>
            )}
          </div>
        )}

        {tab === 'detail' && !detail && selected && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>Loading session…</div>
        )}

        {/* ── Settings tab ──────────────────────────────────────────────── */}
        {tab === 'settings' && (
          <div style={{ maxWidth: 600 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Settings</h3>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--accent-cyan)' }}>Anthropic API Key</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.6 }}>
                  Get one at{' '}
                  <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)' }}>
                    console.anthropic.com
                  </a>
                </p>
                {apiKeyMasked && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-primary)', borderRadius: 8, padding: '0.6rem 1rem', marginBottom: '1rem' }}>
                    <span style={{ color: 'var(--accent-green)', fontSize: '0.85rem' }}>Current key:</span>
                    <code style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{apiKeyMasked}</code>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input className="input" type="password" placeholder="sk-ant-api03-…" value={apiKeyInput}
                    onChange={e => setApiKeyInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveApiKey()} style={{ flex: 1 }} />
                  <button className="btn-primary" onClick={saveApiKey} style={{ whiteSpace: 'nowrap' }}>Save Key</button>
                </div>
                {settingsMsg && (
                  <p style={{ marginTop: '0.75rem', fontSize: '0.88rem', color: settingsMsgType === 'success' ? '#10B981' : '#EF4444' }}>
                    {settingsMsg}
                  </p>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--accent-cyan)' }}>System Info</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.4rem 1rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Account type</span>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{isMultiAdmin ? 'Named account (' + adminInfo?.email + ')' : 'Single admin mode'}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Model</span>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>claude-haiku-4-5-20251001</span>
                  <span style={{ color: 'var(--text-muted)' }}>Database</span>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>SQLite (local)</span>
                  <span style={{ color: 'var(--text-muted)' }}>Video storage</span>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Local filesystem (signed URLs)</span>
                </div>
                <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}
                  disabled={storageLoading}
                  onClick={async () => {
                    setStorageLoading(true);
                    setStorageDebug(null);
                    try {
                      const r = await fetch('/api/admin/debug/storage', { headers: authHeaders(token) });
                      const d = await r.json();
                      setStorageDebug(d);
                    } catch (e) {
                      setStorageDebug({ error: e.message });
                    }
                    setStorageLoading(false);
                  }}>
                  {storageLoading ? 'Checking…' : '🔍 Check Storage'}
                </button>
                {storageDebug && (
                  <pre style={{ marginTop: '0.75rem', fontSize: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem', overflowX: 'auto', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {JSON.stringify(storageDebug, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Branding tab ──────────────────────────────────────────────── */}
        {tab === 'branding' && (
          <div style={{ maxWidth: 600 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>White-Label Branding</h3>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Company Name</label>
                <input className="input" type="text" placeholder="Your Company Name"
                  value={branding.companyName} onChange={e => setBranding(b => ({ ...b, companyName: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Brand Color</label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input type="color" value={branding.brandColor}
                    onChange={e => setBranding(b => ({ ...b, brandColor: e.target.value }))}
                    style={{ width: 48, height: 40, border: 'none', cursor: 'pointer', borderRadius: 6, background: 'none' }} />
                  <input className="input" type="text" value={branding.brandColor}
                    onChange={e => setBranding(b => ({ ...b, brandColor: e.target.value }))} style={{ flex: 1 }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Behavioral Question Position</label>
                <select className="input" value={branding.behavioralPosition}
                  onChange={e => setBranding(b => ({ ...b, behavioralPosition: e.target.value }))}
                  style={{ cursor: 'pointer' }}>
                  <option value="start">Start of interview (warm-up)</option>
                  <option value="end">End of interview</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Company Logo (max 2MB)</label>
                {branding.logoUrl && (
                  <div style={{ marginBottom: '0.75rem', padding: '0.5rem', background: 'var(--bg-primary)', borderRadius: 8, display: 'inline-block' }}>
                    <img src={branding.logoUrl} alt="current logo" style={{ height: 48, objectFit: 'contain', display: 'block' }} />
                  </div>
                )}
                <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files[0])}
                  style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }} />
                {logoFile && <p style={{ fontSize: '0.78rem', color: 'var(--accent-green)', marginTop: '0.3rem' }}>New file selected: {logoFile.name}</p>}
              </div>
              <button className="btn-primary" onClick={saveBranding} style={{ justifyContent: 'center' }}>Save Branding</button>
              {brandingMsg && <p style={{ color: 'var(--accent-green)', fontSize: '0.88rem', textAlign: 'center' }}>{brandingMsg}</p>}

              {/* Preview */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Preview</p>
                <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {branding.logoUrl && <img src={branding.logoUrl} alt="logo" style={{ height: 28, objectFit: 'contain' }} />}
                  <span style={{ color: branding.brandColor, fontWeight: 700, fontSize: '1rem' }}>
                    {branding.companyName || 'Your Company'}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Interview Platform</span>
                  <div style={{ flex: 1 }} />
                  <div style={{ background: branding.brandColor, color: '#fff', padding: '0.3rem 0.75rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600 }}>
                    Start Interview
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Invite links tab ───────────────────────────────────────────── */}
        {tab === 'invites' && (
          <div style={{ maxWidth: 700 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Invite Links</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Generate unique links to share with candidates. Sessions created via each link are automatically linked to your account.
            </p>

            <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Label (optional)</label>
                <input className="input" type="text" placeholder="e.g. Frontend batch May 2026"
                  value={inviteLabel} onChange={e => setInviteLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createInvite()} />
              </div>
              <button className="btn-primary" onClick={createInvite} style={{ whiteSpace: 'nowrap', height: 42 }}>
                + Create Link
              </button>
            </div>

            {inviteMsg && <p style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', marginBottom: '1rem' }}>{inviteMsg}</p>}

            {invites.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No invite links yet. Create one above and share it with candidates.
              </div>
            )}

            {invites.map(inv => {
              const url = `${window.location.origin}/invite/${inv.token}`;
              return (
                <div key={inv.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{inv.label || 'Untitled link'}</p>
                    <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{url}</code>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(inv.created_at).toLocaleDateString()}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-secondary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }} onClick={() => copyInvite(inv.token)}>
                      Copy
                    </button>
                    <button onClick={() => deleteInvite(inv.id)}
                      style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#EF4444', padding: '0.35rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Video player component ─────────────────────────────────────────────────────
function VideoPlayer({ sessionId, videoFile, token }) {
  const [src, setSrc] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const isJwt = token && token.split('.').length === 3;
  const blobUrlRef = useRef(null);

  useEffect(() => {
    if (!videoFile) { setLoading(false); return; }
    setErrorMsg(null);
    setLoading(true);

    if (isJwt) {
      fetch(`/api/videos/${sessionId}/${videoFile}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
        .then(async r => {
          if (!r.ok) {
            let msg = `HTTP ${r.status}`;
            try { const j = await r.json(); msg += `: ${j.error}`; } catch {}
            throw new Error(msg);
          }
          return r.blob();
        })
        .then(blob => {
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          setSrc(url);
          setLoading(false);
        })
        .catch(e => { setErrorMsg(e.message); setLoading(false); });
    } else {
      setSrc(`/api/videos/${sessionId}/${videoFile}?token=${token}`);
      setLoading(false);
    }

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [sessionId, videoFile]);

  if (errorMsg) return <p style={{ fontSize: '0.8rem', color: '#EF4444' }}>⚠ {errorMsg}</p>;
  if (loading) return <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading video…</p>;
  if (!src) return null;

  return (
    <video
      src={src}
      controls
      style={{ width: '100%', maxWidth: 480, borderRadius: 8, background: '#000', display: 'block' }}
    />
  );
}
