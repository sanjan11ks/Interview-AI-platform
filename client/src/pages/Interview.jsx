import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import VideoRecorder from '../components/VideoRecorder';
import QuestionCard from '../components/QuestionCard';
import CountdownTimer from '../components/CountdownTimer';
import ProgressBar from '../components/ProgressBar';

const PREP_SECONDS = 5;
const TOTAL_INTERVIEW_SECONDS = 15 * 60; // 15 minutes

export default function Interview() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const recorderRef = useRef(null);

  const [qIndex, setQIndex] = useState(0);
  const [phase, setPhase] = useState('prep'); // prep | recording | processing | done
  const [prepCount, setPrepCount] = useState(PREP_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');

  // Global 15-minute timer
  const [globalSecondsLeft, setGlobalSecondsLeft] = useState(TOTAL_INTERVIEW_SECONDS);
  const globalTimerRef = useRef(null);

  // Anti-cheat state
  const [violationCount, setViolationCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMsg, setWarningMsg] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const autoSubmitCalledRef = useRef(false);

  const questions = state?.questions || [];
  const sessionId = state?.sessionId;
  const currentQ = questions[qIndex];
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Restore progress from localStorage ──────────────────────────────────
  useEffect(() => {
    if (!sessionId) { navigate('/upload'); return; }
    const saved = localStorage.getItem(`interview_${sessionId}`);
    if (saved) {
      const { savedIndex } = JSON.parse(saved);
      if (savedIndex > 0 && savedIndex < questions.length) setQIndex(savedIndex);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem(`interview_${sessionId}`, JSON.stringify({ savedIndex: qIndex }));
    }
  }, [qIndex, sessionId]);

  // ── Enter fullscreen on mount ────────────────────────────────────────────
  useEffect(() => {
    enterFullscreen();
    return () => {
      document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  function enterFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }

  // ── Fullscreen change detection ──────────────────────────────────────────
  useEffect(() => {
    function onFullscreenChange() {
      const inFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(inFS);

      if (!inFS && phaseRef.current === 'recording') {
        logViolation('fullscreen_exit', 'Candidate exited fullscreen during recording.');
      }
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, []);

  // ── Tab visibility / focus detection ────────────────────────────────────
  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden && phaseRef.current === 'recording') {
        logViolation('tab_switch', 'Candidate switched tabs or minimised window.');
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  // ── Disable right-click ──────────────────────────────────────────────────
  useEffect(() => {
    function noContextMenu(e) { e.preventDefault(); }
    document.addEventListener('contextmenu', noContextMenu);
    return () => document.removeEventListener('contextmenu', noContextMenu);
  }, []);

  // ── Log violation to server ──────────────────────────────────────────────
  async function logViolation(type, details) {
    try {
      const res = await fetch('/api/violations/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, violationType: type, details }),
      });
      const data = await res.json();
      const newCount = data.violationCount || 0;
      setViolationCount(newCount);

      if (newCount === 1) {
        setWarningMsg('⚠️ Warning: Please stay in fullscreen and do not switch tabs. A second violation will auto-submit your interview.');
        setShowWarning(true);
        // Re-enter fullscreen
        enterFullscreen();
        setTimeout(() => setShowWarning(false), 5000);
      } else if (newCount >= 2 && !autoSubmitCalledRef.current) {
        autoSubmitCalledRef.current = true;
        setWarningMsg('🚨 Second violation detected. Your interview is being auto-submitted.');
        setShowWarning(true);
        setTimeout(() => autoSubmitAll(), 2000);
      }
    } catch {}
  }

  // ── Global 15-minute countdown ───────────────────────────────────────────
  useEffect(() => {
    globalTimerRef.current = setInterval(() => {
      setGlobalSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(globalTimerRef.current);
          if (!autoSubmitCalledRef.current) {
            autoSubmitCalledRef.current = true;
            setWarningMsg('⏰ Time is up! Your interview is being auto-submitted.');
            setShowWarning(true);
            setTimeout(() => autoSubmitAll(), 1500);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(globalTimerRef.current);
  }, []);

  function formatGlobalTime(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // ── Prep countdown ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'prep') return;
    setPrepCount(PREP_SECONDS);

    const interval = setInterval(() => {
      setPrepCount(c => {
        if (c <= 1) {
          clearInterval(interval);
          startRecording();
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [qIndex, phase]);

  function startRecording() {
    setPhase('recording');
    setTimerRunning(true);
    recorderRef.current?.startRecording();
  }

  const handleTimerExpire = useCallback(() => {
    if (phase === 'recording') submitAnswer();
  }, [phase]);

  async function submitAnswer() {
    if (phaseRef.current === 'processing') return;
    setPhase('processing');
    setTimerRunning(false);
    setProcessingMsg('Saving your answer…');

    await recorderRef.current?.stopRecording();

    setProcessingMsg('Analysing your response…');

    try {
      await fetch('/api/analysis/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, questionId: currentQ.id }),
      });
    } catch (_) {}

    if (qIndex + 1 >= questions.length) {
      await finalise();
    } else {
      setQIndex(i => i + 1);
      setPhase('prep');
    }
  }

  // Auto-submit all remaining questions and finalise
  async function autoSubmitAll() {
    if (phaseRef.current !== 'recording' && phaseRef.current !== 'prep') {
      await finalise();
      return;
    }
    setPhase('processing');
    setTimerRunning(false);
    setProcessingMsg('Auto-submitting…');

    try { await recorderRef.current?.stopRecording(); } catch {}

    // Analyse current question if there's a recording
    try {
      await fetch('/api/analysis/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, questionId: currentQ?.id }),
      });
    } catch {}

    await finalise();
  }

  async function finalise() {
    setProcessingMsg('Generating your final report…');
    clearInterval(globalTimerRef.current);
    try {
      await fetch('/api/analysis/finalise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    } catch (_) {}

    localStorage.removeItem(`interview_${sessionId}`);
    document.exitFullscreen?.().catch(() => {});
    navigate('/done');
  }

  if (!currentQ) return null;

  const globalPct = (globalSecondsLeft / TOTAL_INTERVIEW_SECONDS) * 100;
  const globalUrgent = globalSecondsLeft < 120;

  return (
    <div
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}
      onKeyDown={e => {
        // Block common shortcuts that could be used to cheat
        if ((e.ctrlKey || e.metaKey) && ['c', 'v', 't', 'w', 'r', 'a'].includes(e.key.toLowerCase())) {
          if (phase === 'recording') e.preventDefault();
        }
      }}
    >
      {/* Violation warning banner */}
      {showWarning && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
          background: violationCount >= 2 ? '#991B1B' : '#92400E',
          color: '#fff',
          padding: '0.9rem 1.5rem',
          textAlign: 'center',
          fontWeight: 600,
          fontSize: '0.95rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          {warningMsg}
        </div>
      )}

      {/* Header */}
      <header style={{
        padding: '0.75rem 2rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        background: 'var(--bg-card)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        marginTop: showWarning ? '3rem' : 0,
      }}>
        <span style={{ color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap' }}>
          Interview AI
        </span>
        <div style={{ flex: 1 }}>
          <ProgressBar current={qIndex + 1} total={questions.length} />
        </div>

        {/* Global timer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: globalUrgent ? 'rgba(239,68,68,0.15)' : 'var(--bg-elevated)',
          border: `1px solid ${globalUrgent ? '#EF4444' : 'var(--border)'}`,
          borderRadius: 8,
          padding: '0.35rem 0.75rem',
          minWidth: 90,
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>⏱</span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.95rem',
            fontWeight: 700,
            color: globalUrgent ? '#EF4444' : 'var(--text-secondary)',
          }}>
            {formatGlobalTime(globalSecondsLeft)}
          </span>
        </div>

        {/* Fullscreen indicator */}
        {!isFullscreen && phase === 'recording' && (
          <button
            onClick={enterFullscreen}
            style={{
              background: '#92400E', border: 'none', borderRadius: 6,
              color: '#FCD34D', padding: '0.35rem 0.75rem', fontSize: '0.78rem',
              cursor: 'pointer', fontWeight: 600,
            }}
          >
            ⛶ Re-enter fullscreen
          </button>
        )}

        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
          {state?.role}
        </span>
      </header>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.5rem',
        padding: '1.5rem 2rem',
        maxWidth: 1100,
        margin: '0 auto',
        width: '100%',
      }}>
        {/* Left: video */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <VideoRecorder
            ref={recorderRef}
            sessionId={sessionId}
            questionId={currentQ.id}
            questionSequence={currentQ.sequence}
          />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
            Your video is recorded locally for assessment only.
          </p>
        </div>

        {/* Right: question + controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <QuestionCard
            question={currentQ}
            sequence={qIndex + 1}
            total={questions.length}
            prepCountdown={phase === 'prep' ? prepCount : null}
          />

          {phase === 'recording' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <CountdownTimer
                totalSeconds={currentQ.timeLimitSeconds || 120}
                onExpire={handleTimerExpire}
                running={timerRunning}
              />
              <button className="btn-danger" onClick={submitAnswer} style={{ width: '100%', justifyContent: 'center' }}>
                Stop & Submit Answer
              </button>
            </div>
          )}

          {phase === 'processing' && (
            <div style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-accent)',
              borderRadius: 12,
              padding: '2rem',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚙️</div>
              <p style={{ color: 'var(--accent-cyan)' }}>{processingMsg}</p>
            </div>
          )}

          {phase === 'prep' && prepCount > 0 && (
            <div style={{ textAlign: 'center' }}>
              <button
                className="btn-secondary"
                onClick={() => { setPrepCount(0); startRecording(); }}
                style={{ fontSize: '0.9rem' }}
              >
                Skip prep — start now
              </button>
            </div>
          )}

          {/* Anti-cheat notice */}
          <div style={{
            marginTop: 'auto',
            background: 'rgba(59,130,246,0.06)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 8,
            padding: '0.6rem 1rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}>
            🔒 This session is proctored. Stay fullscreen. Tab-switching and fullscreen exits are logged.
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 700px) {
          .interview-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
