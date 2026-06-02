import { TTSManager, TTSConfig } from '@repo/tts';

let ttsManager: TTSManager | null = null;

export function initTTS(config: TTSConfig): void {
  if (ttsManager) return;
  ttsManager = new TTSManager(config, 1);
}

export function getTTSManager(): TTSManager {
  if (!ttsManager) {
    throw new Error('TTS not initialized. Call initTTS first.');
  }
  return ttsManager;
}


