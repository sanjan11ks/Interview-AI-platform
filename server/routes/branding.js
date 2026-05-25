const express = require('express');
const { getDb } = require('../db/database');

const router = express.Router();

/**
 * GET /api/branding/:inviteToken
 * Returns public branding for a given invite token (no auth required — used by candidates).
 */
router.get('/:inviteToken', (req, res) => {
  try {
    const db = getDb();
    const invite = db.prepare('SELECT * FROM invite_links WHERE token = ?').get(req.params.inviteToken);
    if (!invite) return res.status(404).json({ error: 'Invalid invite link.' });

    const admin = db.prepare('SELECT company_name, logo_path, brand_color FROM admin_accounts WHERE id = ?')
      .get(invite.admin_id);
    if (!admin) return res.status(404).json({ error: 'Admin not found.' });

    res.json({
      companyName: admin.company_name || 'Interview AI',
      logoUrl: admin.logo_path ? `/uploads/logos/${admin.logo_path}` : null,
      brandColor: admin.brand_color || '#3B82F6',
      adminId: invite.admin_id,
      inviteToken: invite.token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
