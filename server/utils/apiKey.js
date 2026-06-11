/**
 * Resolve the Anthropic API key for a given admin.
 * Priority: admin_accounts.api_key → global_settings → ANTHROPIC_API_KEY env var
 */
const { getDb } = require('../db/database');

function getApiKeyForAdmin(adminId) {
  try {
    const db = getDb();

    // 1. Admin's own key (most specific)
    if (adminId) {
      const admin = db.prepare('SELECT api_key FROM admin_accounts WHERE id = ?').get(adminId);
      if (admin?.api_key) return admin.api_key;
    }

    // 2. Global setting (shared fallback)
    const setting = db.prepare("SELECT value FROM global_settings WHERE key = 'anthropic_api_key'").get();
    if (setting?.value) return setting.value;
  } catch { /* db not ready yet — fall through */ }

  // 3. Environment variable (e.g. set in Railway)
  return process.env.ANTHROPIC_API_KEY || null;
}

module.exports = { getApiKeyForAdmin };
