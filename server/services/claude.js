const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), override: true });
const AnthropicModule = require('@anthropic-ai/sdk');
const Anthropic = AnthropicModule.default || AnthropicModule;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-haiku-4-5-20251001';

function parseJSON(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
}

async function withRetry(fn, attempts = 3, delayMs = 1000) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise(r => setTimeout(r, delayMs * Math.pow(2, i)));
    }
  }
}

async function detectRoleFromResume(resumeText) {
  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1000,
      system: `You are a senior technical recruiter with expertise in identifying tech roles.
Analyse the resume text and return ONLY valid JSON. No markdown, no explanation.`,
      messages: [{
        role: 'user',
        content: `Resume text:\n${resumeText}\n\nReturn this exact JSON structure:
{
  "primary_role": "one of: Frontend Developer | Backend Developer | Full Stack Developer | DevOps Engineer | Cybersecurity Analyst | UI/UX Designer | Mobile Developer | Data Engineer | ML/AI Engineer | SAP Consultant | Cloud Architect | QA Engineer | Blockchain Developer | Embedded Systems Engineer",
  "confidence": 0.0,
  "detected_skills": ["skill1", "skill2"],
  "experience_level": "junior | mid | senior | lead",
  "summary": "2-3 sentence candidate summary",
  "secondary_roles": ["role2", "role3"]
}`
      }]
    });
    return parseJSON(response.content[0].text);
  });
}

async function generateQuestions(role, skills, experienceLevel, behavioralPosition = 'start') {
  return withRetry(async () => {
    const positionNote = behavioralPosition === 'end'
      ? 'Put the 1-2 behavioural questions LAST (sequences 5-6).'
      : 'Put the 1-2 behavioural questions FIRST (sequences 1-2).';

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: `You are a senior technical interviewer. Generate adaptive interview questions.
Return ONLY valid JSON. Questions must be answerable verbally in 1-3 minutes each.`,
      messages: [{
        role: 'user',
        content: `Role: ${role}
Skills detected: ${skills.join(', ')}
Experience level: ${experienceLevel}
Generate exactly 6 questions. Mix these competency areas:
- 1-2 conceptual/theory questions
- 2-3 practical/scenario-based questions
- 1 problem-solving question
- 1-2 behavioural/situational questions (competency must be "behavioural")
${positionNote}
Return JSON:
{
  "questions": [
    {
      "sequence": 1,
      "text": "question text",
      "competency": "conceptual | practical | problem-solving | behavioural",
      "difficulty": "easy | medium | hard",
      "time_limit_seconds": 120,
      "expected_keywords": ["keyword1", "keyword2"],
      "follow_up_hint": "what a strong answer would include",
      "is_behavioral": false
    }
  ]
}`
      }]
    });
    const result = parseJSON(response.content[0].text);
    // Mark behavioral questions
    result.questions = result.questions.map(q => ({
      ...q,
      is_behavioral: q.competency === 'behavioural',
    }));
    return result;
  });
}

async function analyseAnswer(question, transcript, role, durationSeconds) {
  return withRetry(async () => {
    const safeTranscript = transcript && transcript.trim().length >= 10
      ? transcript
      : '[No response provided or response was too short to analyse]';

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: `You are a technical interview evaluator. Analyse answers fairly and constructively.
This is for assessment, not elimination. Return ONLY valid JSON.`,
      messages: [{
        role: 'user',
        content: `Role being interviewed for: ${role}
Question (${question.competency} | ${question.difficulty}): ${question.question_text}
Expected keywords: ${JSON.parse(question.expected_keywords || '[]').join(', ')}
Candidate answer transcript: ${safeTranscript}
Time taken: ${durationSeconds || 0} seconds
Analyse and return:
{
  "score": 0,
  "score_breakdown": {
    "technical_accuracy": 0,
    "communication_clarity": 0,
    "depth_of_knowledge": 0,
    "practical_application": 0
  },
  "keywords_mentioned": [],
  "keywords_missed": [],
  "strengths": [],
  "areas_to_explore": [],
  "answer_summary": "summary text",
  "evaluator_note": "constructive note for admin reviewer"
}`
      }]
    });
    return parseJSON(response.content[0].text);
  });
}

async function generateFinalAnalysis(session, questionsWithAnswers) {
  return withRetry(async () => {
    const answersContext = questionsWithAnswers.map((qa, i) => {
      const analysis = qa.analysis_json ? JSON.parse(qa.analysis_json) : {};
      return `Q${i + 1} [${qa.competency}]: ${qa.question_text}
    Score: ${qa.score || 0}/100
    Summary: ${analysis.answer_summary || 'No answer provided'}`;
    }).join('\n\n');

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2500,
      system: `You are a senior hiring analyst. Write detailed, constructive candidate assessments.
Focus on potential and fit, not elimination. Return ONLY valid JSON.`,
      messages: [{
        role: 'user',
        content: `Candidate role: ${session.confirmed_role}
Experience level: ${session.experience_level || 'unknown'}
Individual answer summaries:
${answersContext}
Generate comprehensive final analysis:
{
  "overall_score": 0,
  "grade": "A | B | C | D",
  "role_fit_percentage": 0,
  "executive_summary": "3-4 paragraph honest assessment",
  "competency_scores": {
    "technical_knowledge": 0,
    "problem_solving": 0,
    "communication": 0,
    "practical_experience": 0
  },
  "top_strengths": ["strength 1", "strength 2", "strength 3"],
  "development_areas": ["area 1", "area 2"],
  "recommended_next_step": "proceed to technical round | panel interview | junior role consideration | skill gap training",
  "role_alternatives": [],
  "hiring_note": "private note for admin - honest and specific"
}`
      }]
    });
    return parseJSON(response.content[0].text);
  });
}

module.exports = { detectRoleFromResume, generateQuestions, analyseAnswer, generateFinalAnalysis };
