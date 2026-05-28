const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { signToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register — create new admin account
router.post('/register', async (req, res) => {
  try {
    const { email, password, companyName } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const db = getDb();
    const existing = db.prepare('SELECT id FROM admin_accounts WHERE email = ?').get(email.toLowerCase());
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

    const hash = await bcrypt.hash(password, 12);
    const adminId = uuidv4();
    db.prepare(`
      INSERT INTO admin_accounts (id, email, password_hash, company_name)
      VALUES (?, ?, ?, ?)
    `).run(adminId, email.toLowerCase(), hash, companyName || 'Interview AI');

    const token = signToken(adminId, email.toLowerCase());
    res.json({ token, adminId, email: email.toLowerCase(), companyName: companyName || 'Interview AI' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login — email+password login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required.' });

    const db = getDb();
    const admin = db.prepare('SELECT * FROM admin_accounts WHERE email = ?').get(email.toLowerCase());
    if (!admin) return res.status(401).json({ error: 'Invalid credentials.' });

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = signToken(admin.id, admin.email);
    res.json({
      token,
      adminId: admin.id,
      email: admin.email,
      companyName: admin.company_name,
      brandColor: admin.brand_color,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me — get current admin info
router.get('/me', requireAdmin, (req, res) => {
  if (!req.adminId) {
    return res.json({ email: 'admin', companyName: 'Interview AI', brandColor: '#3B82F6', isLegacy: true });
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
