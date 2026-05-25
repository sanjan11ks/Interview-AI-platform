const express = require('express');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../db/database');
const { analyseAnswer, generateFinalAnalysis } = require('../services/claude');
const { generateReport } = require('../services/reportGenerator');

const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || './server/uploads';

router.post('/answer', async (req, res) => {
  try {
    const { sessionId, questionId } = req.body;
    if (!sessionId || !questionId) {
      return res.status(400).json({ error: 'sessionId and questionId are required.' });
    }

    const db = getDb();
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found.' });

    const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
    if (!question) return res.status(404).json({ error: 'Question not found.' });

    const answer = db.prepare(
      'SELECT * FROM answers WHERE session_id = ? AND question_id = ?'
    ).get(sessionId, questionId);

    const transcript = answer?.transcript || '';
    const duration = answer?.duration_seconds || 0;

    const analysis = await analyseAnswer(question, transcript, session.confirmed_role, duration);

    if (answer) {
      db.prepare('UPDATE answers SET score = ?, analysis_json = ? WHERE id = ?')
        .run(analysis.score, JSON.stringify(analysis), answer.id);
    }

    res.json({ score: analysis.score, analysis });
  } catch (err) {
    console.error('Answer analysis error:', err);
    res.status(500).json({ error: 'Analysis failed.', detail: err.message });
  }
});

router.post('/finalise', async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required.' });

    const db = getDb();
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found.' });

    const questions = db.prepare(
      'SELECT * FROM questions WHERE session_id = ? ORDER BY sequence'
    ).all(sessionId);

    const answers = db.prepare(
      'SELECT * FROM answers WHERE session_id = ?'
    ).all(sessionId);

    // Join Q&A for context
    const questionsWithAnswers = questions.map(q => {
      const ans = answers.find(a => a.question_id === q.id) || {};
      const analysis = ans.analysis_json ? JSON.parse(ans.analysis_json) : {};
      return { ...q, score: ans.score || 0, analysis_json: ans.analysis_json, ...analysis };
    });

    const finalAnalysis = await generateFinalAnalysis(session, questionsWithAnswers);

    // Generate PDF report
    const reportsDir = path.join(UPLOAD_DIR, 'reports');
    fs.mkdirSync(reportsDir, { recursive: true });
    const safeName = (session.candidate_name || 'candidate').replace(/[^a-z0-9]/gi, '_');
    const reportPath = path.join(reportsDir, `report_${sessionId}_${safeName}.pdf`);

    await generateReport(session, questions, answers, finalAnalysis, reportPath);

    db.prepare(`
      UPDATE sessions SET status = 'analysed', total_score = ?, report_path = ?, final_analysis_json = ?
      WHERE id = ?
    `).run(finalAnalysis.overall_score, reportPath, JSON.stringify(finalAnalysis), sessionId);

    res.json({ overallScore: finalAnalysis.overall_score, grade: finalAnalysis.grade, reportPath });
  } catch (err) {
    console.error('Finalise error:', err);
    res.status(500).json({ error: 'Finalisation failed.', detail: err.message });
  }
});

router.get('/report/:sessionId', (req, res) => {
  try {
    const db = getDb();
    const session = db.prepare('SELECT report_path, total_score FROM sessions WHERE id = ?')
      .get(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    res.json({ reportPath: session.report_path, totalScore: session.total_score });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
