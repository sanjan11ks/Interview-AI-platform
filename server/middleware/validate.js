/**
 * Shared validation helpers used across routes.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_RE = /^[0-9a-f]{32}$/i; // invite tokens (32-char hex)

function isUUID(str) {
  return UUID_RE.test(str);
}

function isToken(str) {
  return TOKEN_RE.test(str);
}

/**
 * Express middleware: validates req.body.sessionId and req.body.questionId
 * are proper UUIDs before the handler runs. Prevents garbage reaching the DB.
 */
function requireValidSessionId(req, res, next) {
  const id = req.body.sessionId || req.params.sessionId || req.params.id;
  if (id && !isUUID(id)) return res.status(400).json({ error: 'Invalid session ID format.' });
  next();
}

function requireValidQuestionId(req, res, next) {
  const id = req.body.questionId || req.params.questionId;
  if (id && !isUUID(id)) return res.status(400).json({ error: 'Invalid question ID format.' });
  next();
}

module.exports = { isUUID, isToken, requireValidSessionId, requireValidQuestionId };
