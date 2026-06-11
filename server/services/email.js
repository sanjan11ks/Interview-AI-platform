const nodemailer = require('nodemailer');
const { getDb } = require('../db/database');

/**
 * Build a transporter from env vars or DB-stored SMTP settings.
 * Returns null if no SMTP is configured.
 */
function getTransporter() {
  const db = getDb();

  function getSetting(key) {
    try {
      const row = db.prepare("SELECT value FROM global_settings WHERE key = ?").get(key);
      return row?.value || '';
    } catch { return ''; }
  }

  const host = process.env.SMTP_HOST || getSetting('smtp_host');
  const port = parseInt(process.env.SMTP_PORT || getSetting('smtp_port') || '587');
  const user = process.env.SMTP_USER || getSetting('smtp_user');
  const pass = process.env.SMTP_PASS || getSetting('smtp_pass');
  const from = process.env.SMTP_FROM || getSetting('smtp_from') || user;

  if (!host || !user || !pass) return null;

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    }),
    from,
  };
}

async function sendPasswordReset(toEmail, resetLink) {
  const config = getTransporter();
  if (!config) {
    throw new Error('SMTP_NOT_CONFIGURED');
  }

  await config.transporter.sendMail({
    from: `"Dasro Interview Platform" <${config.from}>`,
    to: toEmail,
    subject: 'Reset your password — Dasro Interview Platform',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem; color: #111;">
        <img src="https://cdn.prod.website-files.com/66da74c4b22037be1899acf3/66e4088b46d50c9bc1897004_dasro-logo.png"
             alt="Dasro" style="height: 32px; margin-bottom: 2rem;" />
        <h2 style="margin-bottom: 1rem;">Reset your password</h2>
        <p style="color: #555; line-height: 1.6;">
          We received a request to reset the password for your Dasro Interview Platform account.
          Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
        </p>
        <div style="margin: 2rem 0;">
          <a href="${resetLink}" style="background: #3B82F6; color: white; padding: 0.75rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #888; font-size: 0.85rem;">
          If you didn't request this, you can safely ignore this email. Your password will not change.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 2rem 0;" />
        <p style="color: #aaa; font-size: 0.75rem;">Dasro Interview Platform · interview.dasro.ca</p>
      </div>
    `,
  });
}

module.exports = { sendPasswordReset };
