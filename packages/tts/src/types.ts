export interface TTSConfig {
  binaryPath: string;
  modelPath: string;
  opusencBinary?: string;
  audioDir: string;
}

export interface TTSOptions {
  lengthScale?: number;
  noiseScale?: number;
  noiseWScale?: number;
  speakerId?: number;
}


