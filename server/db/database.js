const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { runMigrations } = require('./migrations');

const DB_PATH = path.join(__dirname, '..', '..', 'interview.db');
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
  }
  return db;
}

if (require.main === module) {
  console.log('Initialising database…');
  getDb();
  console.log(`Database ready at ${DB_PATH}`);
}

module.exports = { getDb };
