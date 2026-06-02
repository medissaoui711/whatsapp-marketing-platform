import { PiperTTS } from '../piper-tts';
import { access, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('PiperTTS', () => {
  let tts: PiperTTS;
  const testAudioDir = join(tmpdir(), 'tts-test');

  beforeAll(async () => {
    tts = new PiperTTS({
      binaryPath: 'piper',
      modelPath: './models/en_US-lessac.onnx',
      audioDir: testAudioDir,
    });
  });

  afterAll(async () => {
    try {
      const files = await tts.getCacheStats();
      for (const file of files.files) {
        await unlink(join(testAudioDir, file));
      }
    } catch {
      // ignore cleanup errors
    }
  });

  it('should generate audio from text', async () => {
    const text = 'Hello, this is a test message.';
    const filePath = await tts.generate(text);

    await expect(access(filePath)).resolves.not.toThrow();

    const { stat } = await import('fs/promises');
    const stats = await stat(filePath);
    expect(stats.size).toBeGreaterThan(0);
  });

  it('should cache generated files', async () => {
    const text = 'Cache test message';
    const filePath1 = await tts.generate(text);
    const filePath2 = await tts.generate(text);

    expect(filePath1).toBe(filePath2);
  });

  it('should throw error for empty text', async () => {
    await expect(tts.generate('')).rejects.toThrow('Text cannot be empty');
  });

  it('should throw error for text too long', async () => {
    const longText = 'a'.repeat(5001);
    await expect(tts.generate(longText)).rejects.toThrow('Text too long');
  });

  it('should get cache stats', async () => {
    const text = 'Stats test message';
    await tts.generate(text);

    const stats = await tts.getCacheStats();
    expect(stats.count).toBeGreaterThan(0);
    expect(stats.sizeBytes).toBeGreaterThan(0);
  });

  it('should delete cached file', async () => {
    const text = 'Delete test message';
    const filePath = await tts.generate(text);
    await expect(access(filePath)).resolves.not.toThrow();

    await tts.deleteCached(text);
    await expect(access(filePath)).rejects.toThrow();
  });
});


