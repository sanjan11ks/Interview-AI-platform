const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { generateQuestions } = require('../services/claude');

const router = express.Router();

const ALLOWED_ROLES = [
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'DevOps Engineer',
  'Cybersecurity Analyst', 'UI/UX Designer', 'Mobile Developer', 'Data Engineer',
  'ML/AI Engineer', 'SAP Consultant', 'Cloud Architect', 'QA Engineer',
  'Blockchain Developer', 'Embedded Systems Engineer',
];

router.post('/start', async (req, res) => {
  try {
    const { sessionId, confirmedRole, inviteToken } = req.body;
    if (!sessionId || !confirmedRole) {
      return res.status(400).json({ error: 'sessionId and confirmedRole are required.' });
    }

    if (!ALLOWED_ROLES.includes(confirmedRole)) {
      return res.status(400).json({ error: 'Invalid role selected.' });
    }

    const db = getDb();
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    // Resolve admin_id and behavioral_position from invite token
    let adminId = session.admin_id || null;
    let behavioralPosition = 'start'; // default

    if (inviteToken) {
      const invite = db.prepare('SELECT * FROM invite_links WHERE token = ?').get(inviteToken);
      if (invite) {
        adminId = invite.admin_id;
        const adminAcct = db.prepare('SELECT behavioral_position FROM admin_accounts WHERE id = ?').get(adminId);
        if (adminAcct) behavioralPosition = adminAcct.behavioral_position || 'start';
      }
    }

    // Update session: mark started, set admin_id and invite_token
    db.prepare(`
      UPDATE sessions SET confirmed_role = ?, status = ?, interview_started_at = CURRENT_TIMESTAMP,
      admin_id = ?, invite_token = ?
      WHERE id = ?
    `).run(confirmedRole, 'in_progress', adminId, inviteToken || null, sessionId);

    const skills = extractSkillsFromText(session.resume_text || '');
    const experienceLevel = session.experience_level || 'mid';

    const { questions } = await generateQuestions(confirmedRole, skills, experienceLevel, behavioralPosition);

    const insertQ = db.prepare(`
      INSERT INTO questions (id, session_id, sequence, question_text, competency, difficulty, time_limit_seconds, expected_keywords, follow_up_hint, is_behavioral)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const candidateQuestions = questions.map(q => {
      const qId = uuidv4();
      const isBehavioral = (q.competency === 'behavioural' || q.is_behavioral) ? 1 : 0;
      insertQ.run(
        qId, sessionId, q.sequence, q.text, q.competency, q.difficulty,
        q.time_limit_seconds || 120,
        JSON.stringify(q.expected_keywords || []),
        q.follow_up_hint || '',
        isBehavioral
      );
      return {
        id: qId,
        sequence: q.sequence,
        text: q.text,
        competency: q.competency,
        difficulty: q.difficulty,
        timeLimitSeconds: q.time_limit_seconds || 120,
        isBehavioral: isBehavioral === 1,
      };
    });

    res.json({ questions: candidateQuestions });
  } catch (err) {
    console.error('Interview start error:', err);
    res.status(500).json({ error: 'Failed to generate questions.', detail: err.message });
  }
});

router.get('/question/:sessionId/:sequence', (req, res) => {
  try {
    const { sessionId, sequence } = req.params;
    const db = getDb();
    const q = db.prepare(
      'SELECT * FROM questions WHERE session_id = ? AND sequence = ?'
    ).get(sessionId, parseInt(sequence));

    if (!q) return res.status(404).json({ error: 'Question not found.' });

    res.json({
      id: q.id,
      sequence: q.sequence,
      text: q.question_text,
      competency: q.competency,
      difficulty: q.difficulty,
      timeLimitSeconds: q.time_limit_seconds,
      isBehavioral: q.is_behavioral === 1,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function extractSkillsFromText(text) {
  const COMMON_TECH = [
    'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c++', 'c#', 'php', 'ruby',
    'react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt', 'node.js', 'express', 'fastapi',
    'django', 'spring', 'laravel', 'rails', 'graphql', 'rest', 'grpc',
    'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform', 'ansible',
    'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'kafka',
    'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'nlp',
    'figma', 'sketch', 'adobe xd', 'ui', 'ux',
    'git', 'ci/cd', 'jenkins', 'github actions', 'linux', 'bash',
    'sap', 'salesforce', 'jira', 'agile', 'scrum',
    'ios', 'android', 'swift', 'kotlin', 'flutter', 'react native',
    'solidity', 'ethereum', 'blockchain', 'web3',
    'embedded', 'rtos', 'fpga', 'arm',
  ];
  const lower = text.toLowerCase();
  return COMMON_TECH.filter(skill => lower.includes(skill)).slice(0, 15);
}

module.exports = router;
