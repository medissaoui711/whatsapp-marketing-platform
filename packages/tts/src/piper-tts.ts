import { exec } from 'child_process';
import { promisify } from 'util';
import { createHash } from 'crypto';
import { mkdir, access, rename, unlink, readdir, stat } from 'fs/promises';
import { createReadStream } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';
import type { TTSConfig, TTSOptions } from './types';

const execAsync = promisify(exec) as (cmd: string, options?: any) => Promise<{ stdout: string; stderr: string }>;

export class PiperTTS {
  private binaryPath: string;
  private modelPath: string;
  private opusencBinary: string;
  private audioDir: string;
  private defaultOptions: TTSOptions;

  constructor(config: TTSConfig) {
    this.binaryPath = config.binaryPath;
    this.modelPath = config.modelPath;
    this.opusencBinary = config.opusencBinary || 'opusenc';
    this.audioDir = config.audioDir;
    this.defaultOptions = {
      lengthScale: 1.0,
      noiseScale: 0.667,
      noiseWScale: 0.8,
    };
  }

  private getTextHash(text: string): string {
    return createHash('sha256').update(text).digest('hex').slice(0, 16);
  }

  private getFilePath(text: string, extension: string = 'ogg'): string {
    const hash = this.getTextHash(text);
    return join(this.audioDir, `tts_${hash}.${extension}`);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async ensureDir(dir: string): Promise<void> {
    await mkdir(dir, { recursive: true });
  }

  private async runCommand(cmd: string, args: string[], input?: string): Promise<{ stdout: string; stderr: string }> {
    const command = `${cmd} ${args.join(' ')}`;

    try {
      const options: any = { maxBuffer: 50 * 1024 * 1024 };
      if (input) {
        options.input = input;
      }

      return await execAsync(command, options);
    } catch (error: any) {
      throw new Error(`Command failed: ${cmd}\n${error.stderr || error.message}`);
    }
  }

  private buildPiperArgs(options?: TTSOptions): string[] {
    const opts = { ...this.defaultOptions, ...options };
    const args = [
      '--model', this.modelPath,
      '--length_scale', String(opts.lengthScale),
      '--noise_scale', String(opts.noiseScale),
      '--noise_w', String(opts.noiseWScale),
    ];

    if (opts.speakerId !== undefined) {
      args.push('--speaker', String(opts.speakerId));
    }

    return args;
  }

  async generate(text: string, options?: TTSOptions): Promise<string> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    if (text.length > 5000) {
      throw new Error('Text too long (max 5000 characters)');
    }

    const oggPath = this.getFilePath(text, 'ogg');

    if (await this.fileExists(oggPath)) {
      return oggPath;
    }

    await this.ensureDir(this.audioDir);

    const wavPath = oggPath + '.tmp.wav';
    const tmpOggPath = oggPath + '.tmp.ogg';

    try {
      const piperArgs = this.buildPiperArgs(options);
      piperArgs.push('--output_file', wavPath);

      await this.runCommand(this.binaryPath, piperArgs, text);

      if (!await this.fileExists(wavPath)) {
        throw new Error('Piper did not produce output file');
      }

      const encArgs = [
        '--bitrate', '24',
        '--quiet',
        wavPath,
        tmpOggPath,
      ];

      await this.runCommand(this.opusencBinary, encArgs);

      if (!await this.fileExists(tmpOggPath)) {
        throw new Error('Opusenc did not produce output file');
      }

      await rename(tmpOggPath, oggPath);

      return oggPath;
    } finally {
      try {
        if (await this.fileExists(wavPath)) {
          await unlink(wavPath);
        }
        if (await this.fileExists(tmpOggPath)) {
          await unlink(tmpOggPath);
        }
      } catch (error) {
        console.error('Failed to clean up temporary files:', error);
      }
    }
  }

  async generateStream(text: string, options?: TTSOptions): Promise<Readable> {
    const filePath = await this.generate(text, options);
    return createReadStream(filePath) as unknown as Readable;
  }

  async deleteCached(text: string): Promise<void> {
    const oggPath = this.getFilePath(text, 'ogg');
    try {
      await unlink(oggPath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async clearCache(): Promise<void> {
    try {
      const files = await readdir(this.audioDir);
      for (const file of files) {
        if (file.startsWith('tts_') && (file.endsWith('.ogg') || file.endsWith('.wav'))) {
          await unlink(join(this.audioDir, file));
        }
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async getCacheStats(): Promise<{ count: number; sizeBytes: number; files: string[] }> {
    let count = 0;
    let sizeBytes = 0;
    const files: string[] = [];

    try {
      const entries = await readdir(this.audioDir);
      for (const entry of entries) {
        if (entry.startsWith('tts_') && entry.endsWith('.ogg')) {
          const filePath = join(this.audioDir, entry);
          const stats = await stat(filePath);
          count++;
          sizeBytes += stats.size;
          files.push(entry);
        }
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    return { count, sizeBytes, files };
  }

  async getAudioDuration(filePath: string): Promise<number> {
    try {
      const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`);
      const duration = parseFloat(stdout.trim());
      if (!isNaN(duration)) {
        return duration;
      }
    } catch {
      const stats = await stat(filePath);
      return stats.size / 3000;
    }

    return 0;
  }
}


