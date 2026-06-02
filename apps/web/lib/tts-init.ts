import { initTTS } from './tts';

export function initTTSService(): void {
  const ttsConfig = {
    binaryPath: process.env.PIPER_BINARY || 'piper',
    modelPath: process.env.PIPER_MODEL || './models/voice.onnx',
    opusencBinary: process.env.OPUSENC_BINARY || 'opusenc',
    audioDir: process.env.TTS_AUDIO_DIR || './audio/tts',
  };

  initTTS(ttsConfig);
}


