const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const { UPLOAD_DIR } = require('../utils/paths');

const router = express.Router();

const ENV_PATH = path.join(__dirname, '..', '..', '.env');

// ── Legacy single-password login (kept for backward compat) ─────────────────
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === (process.env.ADMIN_PASSWORD || 'admin123')) {
    res.json({ token: process.env.ADMIN_PASSWORD || 'admin123' });
  } else {
    res.status(401).json({ error: 'Invalid password.' });
  }
});

// ── Sessions ─────────────────────────────────────────────────────────────────
router.get('/sessions', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    let sessions;
    if (req.adminId) {
      // Multi-admin: show only own sessions
      sessions = db.prepare(`
        SELECT id, created_at, candidate_name, candidate_email,
               confirmed_role, status, total_score, report_path, violation_count, flagged
        FROM sessions WHERE admin_id = ?
        ORDER BY created_at DESC
      `).all(req.adminId);
    } else {
      // Legacy admin: show all sessions
      sessions = db.prepare(`
        SELECT id, created_at, candidate_name, candidate_email,
               confirmed_role, status, total_score, report_path, violation_count, flagged
        FROM sessions
        ORDER BY created_at DESC
      `).all();
    }
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/session/:id', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found.' });

    // Multi-admin scope check
    if (req.adminId && session.admin_id && session.admin_id !== req.adminId) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    const questions = db.prepare(
      'SELECT * FROM questions WHERE session_id = ? ORDER BY sequence'
    ).all(req.params.id);

    const answers = db.prepare(
      'SELECT * FROM answers WHERE session_id = ?'
    ).all(req.params.id);

    const violations = db.prepare(
      'SELECT * FROM violations WHERE session_id = ? ORDER BY occurred_at'
    ).all(req.params.id);

    const finalAnalysis = session.final_analysis_json
      ? JSON.parse(session.final_analysis_json)
      : null;

    const qa = questions.map(q => {
      const ans = answers.find(a => a.question_id === q.id) || {};
      // Build video filename from recording_path
      let videoFile = null;
      if (ans.recording_path) {
        videoFile = path.basename(ans.recording_path);
      }
      return {
        ...q,
        expected_keywords: JSON.parse(q.expected_keywords || '[]'),
        answer: { ...ans, videoFile },
        analysis: ans.analysis_json ? JSON.parse(ans.analysis_json) : null,
      };
    });

    res.json({ session: { ...session, final_analysis_json: undefined }, finalAnalysis, qa, violations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Report download ───────────────────────────────────────────────────────────
router.get('/report/:sessionId/download', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const session = db.prepare('SELECT report_path, candidate_name, admin_id FROM sessions WHERE id = ?')
      .get(req.params.sessionId);

    if (!session || !session.report_path) {
      return res.status(404).json({ error: 'Report not found.' });
    }
    if (req.adminId && session.admin_id && session.admin_id !== req.adminId) {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    if (!fs.existsSync(session.report_path)) {
      return res.status(404).json({ error: 'Report file missing from disk.' });
    }

    const safeName = (session.candidate_name || 'candidate').replace(/[^a-z0-9]/gi, '_');
    res.download(session.report_path, `report_${safeName}.pdf`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Settings: API key ────────────────────────────────────────────────────────
router.get('/settings', requireAdmin, (req, res) => {
  try {
    const envContent = fs.readFileSync(ENV_PATH, 'utf8');
    const match = envContent.match(/ANTHROPIC_API_KEY=(.*)$/m);
    const key = match ? match[1].trim() : '';
    const masked = key.length > 12
      ? key.substring(0, 10) + '…' + key.substring(key.length - 4)
      : key ? '••••••••' : '';
    res.json({ apiKeySet: !!key, apiKeyMasked: masked });
  } catch {
    res.json({ apiKeySet: false, apiKeyMasked: '' });
  }
});

router.post('/settings/api-key', requireAdmin, (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || !apiKey.startsWith('sk-ant-')) {
      return res.status(400).json({ error: 'Invalid key. It should start with sk-ant-' });
    }

    let envContent = '';
    try { envContent = fs.readFileSync(ENV_PATH, 'utf8'); } catch {}

    if (envContent.match(/^ANTHROPIC_API_KEY=/m)) {
      envContent = envContent.replace(/^ANTHROPIC_API_KEY=.*$/m, `ANTHROPIC_API_KEY=${apiKey}`);
    } else {
      envContent = `ANTHROPIC_API_KEY=${apiKey}\n${envContent}`;
    }
    fs.writeFileSync(ENV_PATH, envContent);
    process.env.ANTHROPIC_API_KEY = apiKey;

    const masked = apiKey.substring(0, 10) + '…' + apiKey.substring(apiKey.length - 4);
    res.json({ success: true, apiKeyMasked: masked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Branding settings (per admin account) ────────────────────────────────────
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, 'logos');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo_${req.adminId || 'default'}${ext}`);
  },
});
const logoUpload = multer({ storage: logoStorage, limits: { fileSize: 2 * 1024 * 1024 } });

router.get('/branding', requireAdmin, (req, res) => {
  if (!req.adminId) {
    return res.json({ companyName: 'Interview AI', brandColor: '#3B82F6', logoUrl: null, behavioralPosition: 'start' });
  }
  try {
    const db = getDb();
    const admin = db.prepare('SELECT company_name, logo_path, brand_color, behavioral_position FROM admin_accounts WHERE id = ?').get(req.adminId);
    if (!admin) return res.status(404).json({ error: 'Admin not found.' });
    res.json({
      companyName: admin.company_name,
      logoUrl: admin.logo_path ? `/uploads/logos/${admin.logo_path}` : null,
      brandColor: admin.brand_color,
      behavioralPosition: admin.behavioral_position,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/branding', requireAdmin, logoUpload.single('logo'), (req, res) => {
  if (!req.adminId) return res.status(400).json({ error: 'Branding requires a named admin account.' });
  try {
    const { companyName, brandColor, behavioralPosition } = req.body;
    const db = getDb();

    const updates = [];
    const params = [];
    if (companyName) { updates.push('company_name = ?'); params.push(companyName); }
    if (brandColor) { updates.push('brand_color = ?'); params.push(brandColor); }
    if (behavioralPosition) { updates.push('behavioral_position = ?'); params.push(behavioralPosition); }
    // Store only the filename (not full disk path) so it becomes a usable URL
    if (req.file) { updates.push('logo_path = ?'); params.push(req.file.filename); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update.' });

    params.push(req.adminId);
    db.prepare(`UPDATE admin_accounts SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const admin = db.prepare('SELECT company_name, logo_path, brand_color, behavioral_position FROM admin_accounts WHERE id = ?').get(req.adminId);
    res.json({
      companyName: admin.company_name,
      logoUrl: admin.logo_path ? `/uploads/logos/${admin.logo_path}` : null,
      brandColor: admin.brand_color,
      behavioralPosition: admin.behavioral_position,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Invite links ─────────────────────────────────────────────────────────────
router.get('/invites', requireAdmin, (req, res) => {
  if (!req.adminId) return res.json({ invites: [] });
  try {
    const db = getDb();
    const invites = db.prepare('SELECT * FROM invite_links WHERE admin_id = ? ORDER BY created_at DESC').all(req.adminId);
    res.json({ invites });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/invites', requireAdmin, (req, res) => {
  if (!req.adminId) return res.status(400).json({ error: 'Invite links require a named admin account.' });
  try {
    const { label } = req.body;
    const db = getDb();
    const id = uuidv4();
    const token = uuidv4().replace(/-/g, '');
    db.prepare('INSERT INTO invite_links (id, admin_id, token, label) VALUES (?, ?, ?, ?)')
      .run(id, req.adminId, token, label || null);
    const invite = db.prepare('SELECT * FROM invite_links WHERE id = ?').get(id);
    res.json({ invite });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/invites/:id', requireAdmin, (req, res) => {
  if (!req.adminId) return res.status(403).json({ error: 'Forbidden.' });
  try {
    const db = getDb();
    db.prepare('DELETE FROM invite_links WHERE id = ? AND admin_id = ?').run(req.params.id, req.adminId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Violations summary for a session ────────────────────────────────────────
router.get('/violations/:sessionId', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const session = db.prepare('SELECT admin_id FROM sessions WHERE id = ?').get(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    if (req.adminId && session.admin_id && session.admin_id !== req.adminId) {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    const violations = db.prepare('SELECT * FROM violations WHERE session_id = ? ORDER BY occurred_at').all(req.params.sessionId);
    res.json({ violations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Debug: show server paths and recording files ─────────────────────────────
router.get('/debug/storage', requireAdmin, (req, res) => {
  try {
    const recordingsDir = path.join(UPLOAD_DIR, 'recordings');
    const exists = fs.existsSync(recordingsDir);
    let sessions = [];
    if (exists) {
      sessions = fs.readdirSync(recordingsDir).map(sessionDir => {
        const sessionPath = path.join(recordingsDir, sessionDir);
        let files = [];
        try { files = fs.readdirSync(sessionPath); } catch {}
        return { sessionDir, files };
      });
    }
    res.json({
      UPLOAD_DIR,
      NODE_ENV: process.env.NODE_ENV,
      recordingsDirExists: exists,
      sessions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
