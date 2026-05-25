const COMPETENCY_COLOURS = {
  conceptual: 'pill-blue',
  practical: 'pill-cyan',
  'problem-solving': 'pill-amber',
  behavioural: 'pill-green',
};

const DIFFICULTY_COLOURS = {
  easy: 'pill-green',
  medium: 'pill-amber',
  hard: 'pill-red',
};

export default function QuestionCard({ question, sequence, total, prepCountdown }) {
  if (!question) return null;

  return (
    <div className="card fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span className={`pill ${COMPETENCY_COLOURS[question.competency] || 'pill-blue'}`}>
          {question.competency}
        </span>
        <span className={`pill ${DIFFICULTY_COLOURS[question.difficulty] || 'pill-amber'}`}>
          {question.difficulty}
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          {sequence} / {total}
        </span>
      </div>

      <p style={{
        fontSize: '1.15rem',
        lineHeight: 1.65,
        color: 'var(--text-primary)',
        fontWeight: 400,
        flex: 1,
      }}>
        {question.text}
      </p>

      {prepCountdown !== null && prepCountdown > 0 && (
        <div style={{
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 10,
          padding: '0.75rem 1rem',
          color: '#FCD34D',
          fontSize: '0.9rem',
          textAlign: 'center',
        }}>
          Recording starts in <strong>{prepCountdown}s</strong> — read the question carefully
        </div>
      )}
    </div>
  );
}
