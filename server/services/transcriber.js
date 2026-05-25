// Server-side transcript handler.
// The primary transcript source is the browser Web Speech API (sent via POST).
// This module provides a Whisper fallback for audio files when needed.

const fs = require('fs');
const path = require('path');

async function transcribeAudioFile(audioPath) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const stream = fs.createReadStream(audioPath);
    const response = await openai.audio.transcriptions.create({
      file: stream,
      model: 'whisper-1',
    });
    return response.text;
  } catch (err) {
    console.error('Whisper transcription failed:', err.message);
    return null;
  }
}

module.exports = { transcribeAudioFile };
