import { useEffect, useState } from 'react';

export default function CountdownTimer({ totalSeconds, onExpire, running }) {
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    setRemaining(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) { onExpire?.(); return; }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [running, remaining, onExpire]);

  const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
  const secs = String(remaining % 60).padStart(2, '0');
  const pct = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const urgent = remaining <= 30;

  const colour = urgent ? '#EF4444' : remaining <= 60 ? '#F59E0B' : 'var(--accent-cyan)';

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle
          cx="50" cy="50" r="44"
          fill="none"
          stroke={colour}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 44}`}
          strokeDashoffset={`${2 * Math.PI * 44 * (1 - pct)}`}
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
        />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
          fill={colour} fontSize="18" fontFamily="JetBrains Mono, monospace" fontWeight="500">
          {mins}:{secs}
        </text>
      </svg>
      {urgent && (
        <p style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
          Wrap up your answer
        </p>
      )}
    </div>
  );
}
