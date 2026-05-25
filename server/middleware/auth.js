const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'interview-ai-jwt-secret-change-in-prod';
const LEGACY_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * requireAdmin — accepts:
 *   1. JWT Bearer token  (multi-admin — sets req.adminId)
 *   2. Legacy password token in x-admin-token or ?token query  (sets req.adminId = null)
 */
function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const legacyToken = req.headers['x-admin-token'] || req.query.token;

  // Try JWT first
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.adminId = payload.adminId;
      req.adminEmail = payload.email;
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
  }

  // Fall back to legacy password token (single-admin mode)
  if (legacyToken === LEGACY_PASSWORD) {
    req.adminId = null; // null means "legacy admin — sees all sessions"
    req.adminEmail = 'admin';
    return next();
  }

  res.status(401).json({ error: 'Unauthorised.' });
}

function signToken(adminId, email) {
  return jwt.sign({ adminId, email }, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { requireAdmin, signToken, JWT_SECRET };
