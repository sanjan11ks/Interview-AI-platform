const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { extractTextFromFile } = require('../services/parser');
const { detectRoleFromResume } = require('../services/claude');
const fs = require('fs');

const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || './server/uploads';
const MAX_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, 'resumes');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.txt'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, and TXT files are accepted.'));
    }
  },
});

router.post('/resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { candidateName, candidateEmail, inviteToken } = req.body;
    if (!candidateName || !candidateEmail) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    let resumeText;
    try {
      resumeText = await extractTextFromFile(req.file.path);
    } catch (err) {
      return res.status(422).json({
        error: "We couldn't read your resume. Try a text-based PDF or DOCX.",
        detail: err.message,
      });
    }

    let roleData;
    try {
      roleData = await detectRoleFromResume(resumeText);
    } catch (err) {
      if (err.message === 'NO_API_KEY') {
        return res.status(503).json({ error: 'No API key configured. Please ask the admin to add their Anthropic API key in the Settings tab.' });
      }
      throw err;
    }

    // Resolve admin_id from invite token (if provided)
    const sessionId = uuidv4();
    const db = getDb();
    let adminId = null;
    if (inviteToken) {
      const invite = db.prepare('SELECT admin_id FROM invite_links WHERE token = ?').get(inviteToken);
      if (invite) adminId = invite.admin_id;
    }

    db.prepare(`
      INSERT INTO sessions (id, candidate_name, candidate_email, resume_path, resume_text, detected_role, experience_level, status, admin_id, invite_token)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(sessionId, candidateName, candidateEmail, req.file.path, resumeText, roleData.primary_role, roleData.experience_level, adminId, inviteToken || null);

    res.json({
      sessionId,
      detectedRole: roleData.primary_role,
      confidence: roleData.confidence,
      detectedSkills: roleData.detected_skills,
      experienceLevel: roleData.experience_level,
      summary: roleData.summary,
      secondaryRoles: roleData.secondary_roles,
      inviteToken: inviteToken || null,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Server error during upload.', detail: err.message });
  }
});

module.exports = router;
