export default function ScoreGauge({ score = 0, grade = '?', size = 140 }) {
  const r = (size / 2) - 12;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);

  const colour =
    score >= 80 ? '#10B981' :
    score >= 60 ? '#06B6D4' :
    score >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--border)" strokeWidth="10"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={colour}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 700, color: colour }}>
          {grade}
        </span>
        <span style={{ fontSize: size * 0.12, color: 'var(--text-muted)' }}>
          {Math.round(score)}/100
        </span>
      </div>
    </div>
  );
}
