import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';

const VideoRecorder = forwardRef(function VideoRecorder(
  { sessionId, questionId, questionSequence, onTranscriptUpdate, onRecordingComplete },
  ref
) {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const startTimeRef = useRef(null);

  const [status, setStatus] = useState('idle'); // idle | requesting | ready | recording | processing | error
  const [error, setError] = useState(null);
  const [liveTranscript, setLiveTranscript] = useState('');

  // Expose start/stop to parent via ref
  useImperativeHandle(ref, () => ({
    startRecording,
    stopRecording,
    status: () => status,
  }));

  useEffect(() => {
    initStream();
    return () => {
      stopStream();
      stopSpeechRecognition();
    };
  }, []);

  async function initStream() {
    setStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStatus('ready');
    } catch (err) {
      setError(getPermissionError(err));
      setStatus('error');
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop());
  }

  function startSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t + ' ';
        else interim += t;
      }
      if (final) {
        transcriptRef.current += final;
      }
      const display = transcriptRef.current + interim;
      setLiveTranscript(display);
      onTranscriptUpdate?.(display);
    };

    recognition.onerror = () => {}; // silent — not critical
    recognition.start();
    recognitionRef.current = recognition;
  }

  function stopSpeechRecognition() {
    try { recognitionRef.current?.stop(); } catch (_) {}
    recognitionRef.current = null;
  }

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    transcriptRef.current = '';
    setLiveTranscript('');
    startTimeRef.current = Date.now();

    const mimeType = getSupportedMimeType();
    const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : {});
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.start(1000);
    mediaRecorderRef.current = recorder;

    startSpeechRecognition();
    setStatus('recording');
  }, []);

  const stopRecording = useCallback(async () => {
    setStatus('processing');
    stopSpeechRecognition();

    const duration = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : 0;

    await new Promise(resolve => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') { resolve(); return; }
      recorder.onstop = resolve;
      recorder.stop();
    });

    const blob = new Blob(chunksRef.current, { type: 'video/webm' });
    const finalTranscript = transcriptRef.current.trim();

    // Save recording blob
    try {
      const formData = new FormData();
      formData.append('recording', blob, `q${questionSequence}.webm`);
      formData.append('sessionId', sessionId);
      formData.append('questionId', questionId);
      formData.append('questionSequence', String(questionSequence));

      await fetch('/api/recording/save', { method: 'POST', body: formData });
    } catch (_) {}

    // Save transcript
    try {
      await fetch('/api/recording/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, questionId, transcript: finalTranscript, durationSeconds: duration }),
      });
    } catch (_) {}

    onRecordingComplete?.({ transcript: finalTranscript, duration });
    setStatus('ready');
  }, [sessionId, questionId, questionSequence, onRecordingComplete]);

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: 12, overflow: 'hidden' }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
      />

      {status === 'requesting' && (
        <Overlay>
          <p style={{ color: 'var(--text-secondary)' }}>Requesting camera access…</p>
        </Overlay>
      )}

      {status === 'error' && (
        <Overlay>
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <p style={{ color: '#EF4444', marginBottom: '0.5rem' }}>Camera / microphone access denied</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{error}</p>
          </div>
        </Overlay>
      )}

      {status === 'processing' && (
        <Overlay>
          <p style={{ color: 'var(--accent-cyan)' }}>Saving your answer…</p>
        </Overlay>
      )}

      {/* Recording indicator */}
      {status === 'recording' && (
        <div style={{
          position: 'absolute', top: 12, left: 12,
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          background: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: '0.3rem 0.6rem',
        }}>
          <span className="rec-dot" />
          <span style={{ color: 'white', fontSize: '0.8rem', fontWeight: 500 }}>REC</span>
        </div>
      )}

      {/* Live transcript ghost text */}
      {status === 'recording' && liveTranscript && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
          padding: '1.5rem 1rem 0.75rem',
          maxHeight: '35%', overflow: 'hidden',
        }}>
          <p style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            fontStyle: 'italic',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {liveTranscript}
          </p>
        </div>
      )}
    </div>
  );
});

function Overlay({ children }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)',
    }}>
      {children}
    </div>
  );
}

function getSupportedMimeType() {
  const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
  return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
}

function getPermissionError(err) {
  if (err.name === 'NotAllowedError') return 'Please allow camera and microphone access in your browser settings.';
  if (err.name === 'NotFoundError') return 'No camera or microphone found on this device.';
  return err.message;
}

export default VideoRecorder;
