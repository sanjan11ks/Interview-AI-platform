const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');

const router = express.Router();

// POST /api/violations/log — called by client when anti-cheat violation detected
router.post('/log', (req, res) => {
  try {
    const { sessionId, violationType, details } = req.body;
    if (!sessionId || !violationType) {
      return res.status(400).json({ error: 'sessionId and violationType are required.' });
    }

    const db = getDb();
    const session = db.prepare('SELECT id, violation_count, flagged FROM sessions WHERE id = ?').get(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found.' });

    // Insert violation record
    const vId = uuidv4();
    db.prepare(`
      INSERT INTO violations (id, session_id, violation_type, details)
      VALUES (?, ?, ?, ?)
    `).run(vId, sessionId, violationType, details || null);

    // Increment violation counter
    const newCount = (session.violation_count || 0) + 1;
    // Flag session if 2+ violations (auto-flag threshold)
    const shouldFlag = newCount >= 2 ? 1 : 0;
    db.prepare('UPDATE sessions SET violation_count = ?, flagged = ? WHERE id = ?')
      .run(newCount, shouldFlag, sessionId);

    res.json({ violationCount: newCount, flagged: shouldFlag === 1 });
  } catch (err) {
    console.error('Violation log error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
