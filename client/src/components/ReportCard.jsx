import ScoreGauge from './ScoreGauge';

function SubScoreBar({ label, value }) {
  const colour =
    value >= 20 ? '#10B981' :
    value >= 15 ? '#06B6D4' :
    value >= 10 ? '#F59E0B' : '#EF4444';
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: '0.8rem', color: colour, fontFamily: 'var(--font-mono)' }}>{value}/25</span>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
        <div style={{
          height: '100%', width: `${(value / 25) * 100}%`,
          background: colour, borderRadius: 3, transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  );
}

export default function ReportCard({ qa, index }) {
  const { question, answer } = qa;
  const analysis = answer?.analysis || {};
  const score = answer?.score ?? 0;
  const sb = analysis.score_breakdown || {};

  return (
    <details style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-accent)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <summary style={{
        padding: '1rem 1.25rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        userSelect: 'none',
      }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', minWidth: 24 }}>
          Q{index + 1}
        </span>
        <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
          {question.question_text}
        </span>
        <span style={{
          color: score >= 70 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444',
          fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.9rem',
        }}>
          {Math.round(score)}/100
        </span>
      </summary>

      <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Sub-score bars */}
        <div>
          <SubScoreBar label="Technical Accuracy" value={sb.technical_accuracy ?? 0} />
          <SubScoreBar label="Communication Clarity" value={sb.communication_clarity ?? 0} />
          <SubScoreBar label="Depth of Knowledge" value={sb.depth_of_knowledge ?? 0} />
          <SubScoreBar label="Practical Application" value={sb.practical_application ?? 0} />
        </div>

        {analysis.strengths?.length > 0 && (
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Strengths</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {analysis.strengths.map((s, i) => (
                <span key={i} className="pill pill-green">{s}</span>
              ))}
            </div>
          </div>
        )}

        {analysis.areas_to_explore?.length > 0 && (
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Areas to explore</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {analysis.areas_to_explore.map((a, i) => (
                <span key={i} className="pill pill-amber">{a}</span>
              ))}
            </div>
          </div>
        )}

        {analysis.answer_summary && (
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Answer summary</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {analysis.answer_summary}
            </p>
          </div>
        )}

        {analysis.evaluator_note && (
          <div style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 8,
            padding: '0.75rem',
          }}>
            <p style={{ fontSize: '0.75rem', color: '#F59E0B', marginBottom: '0.25rem', fontWeight: 600 }}>
              EVALUATOR NOTE (admin only)
            </p>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              {analysis.evaluator_note}
            </p>
          </div>
        )}

        {answer?.recording_path && (
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Recording</p>
            <video
              controls
              style={{ width: '100%', maxWidth: 480, borderRadius: 8, background: '#000' }}
              src={`/api/admin/recording/${answer.id}`}
            />
          </div>
        )}
      </div>
    </details>
  );
}
