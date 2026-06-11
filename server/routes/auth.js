const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { signToken, requireAdmin } = require('../middleware/auth');
const { sendPasswordReset } = require('../services/email');

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

// ── Forgot password ───────────────────────────────────────────────────────────
router.post('/forgot-password', authLimiter, async (req, res) => {
  // Always return 200 — never reveal whether an email exists
  const genericOk = { message: 'If an account with that email exists, a reset link has been sent.' };

  try {
    const email = sanitise(req.body.email || '').toLowerCase();
    if (!email || !isValidEmail(email)) return res.json(genericOk);

    const db = getDb();
    const admin = db.prepare('SELECT id FROM admin_accounts WHERE email = ?').get(email);
    if (!admin) return res.json(genericOk); // don't reveal account existence

    // Generate a secure 32-byte hex token, expires in 1 hour
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Invalidate any existing unused tokens for this admin
    db.prepare('DELETE FROM password_reset_tokens WHERE admin_id = ?').run(admin.id);
    db.prepare('INSERT INTO password_reset_tokens (token, admin_id, expires_at) VALUES (?, ?, ?)')
      .run(token, admin.id, expiresAt);

    const baseUrl = process.env.APP_URL || 'https://interview.dasro.ca';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    try {
      await sendPasswordReset(email, resetLink);
    } catch (emailErr) {
      if (emailErr.message === 'SMTP_NOT_CONFIGURED') {
        // Log the link to server logs as fallback (admin can check Railway console)
        console.warn(`[Password Reset] No SMTP configured. Reset link for ${email}: ${resetLink}`);
        return res.status(503).json({
          error: 'Email is not configured on this server. Please ask your administrator to check the Railway console logs for the reset link, or configure SMTP in Settings.',
        });
      }
      throw emailErr;
    }

    res.json(genericOk);
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request.' });
  }
});

// ── Reset password ────────────────────────────────────────────────────────────
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const token = sanitise(req.body.token || '', 80);
    const password = sanitise(req.body.password || '', 128);

    if (!token || !password) return res.status(400).json({ error: 'Token and new password are required.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const db = getDb();
    const row = db.prepare('SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0').get(token);

    if (!row) return res.status(400).json({ error: 'Invalid or already-used reset link.' });
    if (new Date(row.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
    }

    const hash = await bcrypt.hash(password, 12);
    db.prepare('UPDATE admin_accounts SET password_hash = ? WHERE id = ?').run(hash, row.admin_id);
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE token = ?').run(token);

    res.json({ message: 'Password updated successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

module.exports = router;
