const express = require('express');
const path = require('path');
const fs = require('fs');
const { requireAdmin } = require('../middleware/auth');
const { getDb } = require('../db/database');

const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '..', '..', 'server', 'uploads');

/**
 * GET /api/videos/:sessionId/:filename
 * Streams a video file securely (admin-only).
 * Supports byte-range requests for native <video> seeking.
 */
router.get('/:sessionId/:filename', requireAdmin, (req, res) => {
  try {
    const { sessionId, filename } = req.params;

    // Sanitise: only alphanumeric, dash, underscore, dot
    if (!/^[a-zA-Z0-9_-]+$/.test(sessionId) || !/^[a-zA-Z0-9_.\-]+$/.test(filename)) {
      return res.status(400).json({ error: 'Invalid path.' });
    }

    // Verify session belongs to this admin
    if (req.adminId) {
      const db = getDb();
      const session = db.prepare('SELECT admin_id FROM sessions WHERE id = ?').get(sessionId);
      if (!session) return res.status(404).json({ error: 'Session not found.' });
      if (session.admin_id && session.admin_id !== req.adminId) {
        return res.status(403).json({ error: 'Forbidden.' });
      }
    }

    const filePath = path.join(UPLOAD_DIR, 'recordings', sessionId, filename);

    // Prevent path traversal
    const resolvedPath = path.resolve(filePath);
    const allowedBase = path.resolve(path.join(UPLOAD_DIR, 'recordings'));
    if (!resolvedPath.startsWith(allowedBase)) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'Video file not found.' });
    }

    const stat = fs.statSync(resolvedPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Support byte-range for video seeking
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/webm',
      });
      fs.createReadStream(resolvedPath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/webm',
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(resolvedPath).pipe(res);
    }
  } catch (err) {
    console.error('Video stream error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
