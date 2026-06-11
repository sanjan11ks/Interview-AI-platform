const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { signToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ── Strict rate limit for auth endpoints (5 attempts / 15 min per IP) ────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true, // only count failures
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait 15 minutes before trying again.' },
});

// Simple input sanitiser — strips control chars and trims
function sanitise(str, maxLen = 255) {
  if (typeof str !== 'string') return '';
  return str.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, maxLen);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

// ── Register ──────────────────────────────────────────────────────────────────
router.post('/register', authLimiter, async (req, res) => {
  try {
    const email = sanitise(req.body.email || '').toLowerCase();
    const password = sanitise(req.body.password || '', 128);
    const companyName = sanitise(req.body.companyName || '', 120);

    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email address.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const db = getDb();
    const existing = db.prepare('SELECT id FROM admin_accounts WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

    const hash = await bcrypt.hash(password, 12);
    const adminId = uuidv4();
    db.prepare(`
      INSERT INTO admin_accounts (id, email, password_hash, company_name)
      VALUES (?, ?, ?, ?)
    `).run(adminId, email, hash, companyName || 'Dasro');

    const token = signToken(adminId, email);
    res.json({ token, adminId, email, companyName: companyName || 'Dasro' });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed.' }); // don't leak internals
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', authLimiter, async (req, res) => {
  try {
    const email = sanitise(req.body.email || '').toLowerCase();
    const password = sanitise(req.body.password || '', 128);

    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    if (!isValidEmail(email)) return res.status(401).json({ error: 'Invalid credentials.' });

    const db = getDb();
    const admin = db.prepare('SELECT * FROM admin_accounts WHERE email = ?').get(email);

    // Always run bcrypt compare (even on no-match) to prevent timing attacks
    const dummyHash = '$2a$12$invalidhashtopreventtimingattacks00000000000000000000000';
    const valid = admin
      ? await bcrypt.compare(password, admin.password_hash)
      : await bcrypt.compare(password, dummyHash).then(() => false);

    if (!admin || !valid) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = signToken(admin.id, admin.email);
    res.json({
      token,
      adminId: admin.id,
      email: admin.email,
      companyName: admin.company_name,
      brandColor: admin.brand_color,
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed.' });
  }
});

// ── Me ────────────────────────────────────────────────────────────────────────
router.get('/me', requireAdmin, (req, res) => {
  if (!req.adminId) {
    return res.json({ email: 'admin', companyName: 'Dasro', brandColor: '#3B82F6', isLegacy: true });
  }
  try {
    const db = getDb();
    const admin = db.prepare('SELECT id, email, company_name, logo_path, brand_color, behavioral_position FROM admin_accounts WHERE id = ?').get(req.adminId);
    if (!admin) return res.status(401).json({ error: 'Account no longer exists. Please log in again.' });
    res.json({
      adminId: admin.id,
      email: admin.email,
      companyName: admin.company_name,
      logoUrl: admin.logo_path ? `/uploads/logos/${admin.logo_path}` : null,
      brandColor: admin.brand_color,
      behavioralPosition: admin.behavioral_position,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch account.' });
  }
});

module.exports = router;
