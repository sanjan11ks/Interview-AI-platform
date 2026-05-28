/**
 * Additive-only migrations. Safe to run on every startup.
 * Uses PRAGMA table_info to check before ALTER TABLE.
 */
function runMigrations(db) {
  // ── sessions additions ───────────────────────────────────────────────────
  const sessionCols = db.pragma('table_info(sessions)').map(c => c.name);
  if (!sessionCols.includes('admin_id'))
    db.exec("ALTER TABLE sessions ADD COLUMN admin_id TEXT");
  if (!sessionCols.includes('invite_token'))
    db.exec("ALTER TABLE sessions ADD COLUMN invite_token TEXT");
  if (!sessionCols.includes('interview_started_at'))
    db.exec("ALTER TABLE sessions ADD COLUMN interview_started_at DATETIME");
  if (!sessionCols.includes('violation_count'))
    db.exec("ALTER TABLE sessions ADD COLUMN violation_count INTEGER DEFAULT 0");
  if (!sessionCols.includes('flagged'))
    db.exec("ALTER TABLE sessions ADD COLUMN flagged INTEGER DEFAULT 0");

  // ── questions additions ──────────────────────────────────────────────────
  const questionCols = db.pragma('table_info(questions)').map(c => c.name);
  if (!questionCols.includes('is_behavioral'))
    db.exec("ALTER TABLE questions ADD COLUMN is_behavioral INTEGER DEFAULT 0");

  // ── answers additions ────────────────────────────────────────────────────
  const answerCols = db.pragma('table_info(answers)').map(c => c.name);
  if (!answerCols.includes('video_url'))
    db.exec("ALTER TABLE answers ADD COLUMN video_url TEXT");

  // ── new tables ───────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_accounts (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      company_name TEXT DEFAULT 'Interview AI',
      logo_path TEXT,
      brand_color TEXT DEFAULT '#3B82F6',
      behavioral_position TEXT DEFAULT 'start',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS violations (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      violation_type TEXT NOT NULL,
      occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      details TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS invite_links (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      label TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES admin_accounts(id)
    );

    CREATE TABLE IF NOT EXISTS global_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('  ✓ DB migrations applied');
}

module.exports = { runMigrations };
