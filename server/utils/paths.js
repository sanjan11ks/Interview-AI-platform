const path = require('path');

/**
 * Single source of truth for the upload directory.
 * Priority:
 *   1. UPLOAD_DIR env var (explicit override)
 *   2. /data/uploads  when NODE_ENV=production  (Railway persistent volume)
 *   3. <repo>/server/uploads  for local dev
 */
const UPLOAD_DIR = path.resolve(
  process.env.UPLOAD_DIR ||
  (process.env.NODE_ENV === 'production'
    ? '/data/uploads'
    : path.join(__dirname, '..', '..', 'server', 'uploads'))
);

module.exports = { UPLOAD_DIR };
