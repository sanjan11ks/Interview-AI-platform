const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');

const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || './server/uploads';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { sessionId, questionSequence } = req.body;
    const dir = path.join(UPLOAD_DIR, 'recordings', sessionId || 'unknown');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const seq = req.body.questionSequence || '0';
    cb(null, `q${seq}.webm`);
  },
});

const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

router.post('/save', upload.single('recording'), async (req, res) => {
  try {
    const { sessionId, questionId, questionSequence } = req.body;
    if (!sessionId || !questionId) {
      return res.status(400).json({ error: 'sessionId and questionId are required.' });
    }

    const recordingPath = req.file ? req.file.path : null;

    const db = getDb();
    const existing = db.prepare('SELECT id FROM answers WHERE session_id = ? AND question_id = ?')
      .get(sessionId, questionId);

    if (existing) {
      db.prepare('UPDATE answers SET recording_path = ? WHERE id = ?')
        .run(recordingPath, existing.id);
      return res.json({ answerId: existing.id, recordingPath });
    }

    const answerId = uuidv4();
    db.prepare(`
      INSERT INTO answers (id, session_id, question_id, recording_path)
      VALUES (?, ?, ?, ?)
    `).run(answerId, sessionId, questionId, recordingPath);

    res.json({ answerId, recordingPath });
  } catch (err) {
    console.error('Recording save error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/transcript', (req, res) => {
  try {
    const { sessionId, questionId, transcript, durationSeconds } = req.body;
    if (!sessionId || !questionId) {
      return res.status(400).json({ error: 'sessionId and questionId are required.' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM answers WHERE session_id = ? AND question_id = ?')
      .get(sessionId, questionId);

    if (existing) {
      db.prepare('UPDATE answers SET transcript = ?, duration_seconds = ? WHERE id = ?')
        .run(transcript || '', durationSeconds || 0, existing.id);
      return res.json({ answerId: existing.id });
    }

    const answerId = uuidv4();
    db.prepare(`
      INSERT INTO answers (id, session_id, question_id, transcript, duration_seconds)
      VALUES (?, ?, ?, ?, ?)
    `).run(answerId, sessionId, questionId, transcript || '', durationSeconds || 0);

    res.json({ answerId });
  } catch (err) {
    console.error('Transcript save error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
