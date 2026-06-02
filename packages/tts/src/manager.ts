import { PiperTTS } from './piper-tts';
import type { TTSConfig, TTSOptions } from './types';

interface TTSTask {
  id: string;
  text: string;
  resolve: (value: string) => void;
  reject: (reason: Error) => void;
  options?: TTSOptions;
}

export class TTSManager {
  private tts: PiperTTS;
  private queue: TTSTask[] = [];
  private processing: boolean = false;
  private maxConcurrent: number;
  private cache: Map<string, string> = new Map();

  constructor(config: TTSConfig, maxConcurrent: number = 1) {
    this.tts = new PiperTTS(config);
    this.maxConcurrent = maxConcurrent;
  }

  async synthesize(text: string, options?: TTSOptions): Promise<string> {
    const cacheKey = this.getCacheKey(text, options);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    return new Promise((resolve, reject) => {
      const task: TTSTask = {
        id: cacheKey,
        text,
        resolve,
        reject,
        options,
      };
      this.queue.push(task);
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) continue;

      try {
        const filePath = await this.tts.generate(task.text, task.options);
        this.cache.set(task.id, filePath);
        task.resolve(filePath);
      } catch (error) {
        task.reject(error as Error);
      }
    }

    this.processing = false;
  }

  private getCacheKey(text: string, options?: TTSOptions): string {
    const opts = options ? JSON.stringify(options) : '';
    return `${text}|${opts}`;
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
    await this.tts.clearCache();
  }

  async getStats(): Promise<{ queueLength: number; cacheSize: number; diskStats: any }> {
    const diskStats = await this.tts.getCacheStats();
    return {
      queueLength: this.queue.length,
      cacheSize: this.cache.size,
      diskStats,
    };
  }
}


