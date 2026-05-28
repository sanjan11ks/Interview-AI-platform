const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { runMigrations } = require('./migrations');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'interview.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schema);
    runMigrations(db);

    // Restore API key from DB into process.env so it survives redeploys
    try {
      const setting = db.prepare("SELECT value FROM global_settings WHERE key = 'anthropic_api_key'").get();
      if (setting?.value) {
        process.env.ANTHROPIC_API_KEY = setting.value;
        console.log('  ✓ Anthropic API key loaded from database');
      }
    } catch {}
  }
  return db;
}

if (require.main === module) {
  console.log('Initialising database…');
  getDb();
  console.log(`Database ready at ${DB_PATH}`);
}

module.exports = { getDb };
