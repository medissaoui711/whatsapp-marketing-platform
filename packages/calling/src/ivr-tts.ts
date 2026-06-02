import { Readable } from 'stream';
import { createReadStream } from 'fs';

export interface IVRTTSProvider {
  synthesize(text: string, options?: any): Promise<string>;
}

export async function synthesizeIVRMessage(text: string, ttsProvider: IVRTTSProvider): Promise<Readable> {
  const filePath = await ttsProvider.synthesize(text, {
    lengthScale: 1.1,
    noiseScale: 0.5,
  });

  return createReadStream(filePath);
}

export async function preloadIVRMessages(messages: Record<string, string>, ttsProvider: IVRTTSProvider): Promise<void> {
  const promises = Object.values(messages).map(text => ttsProvider.synthesize(text));
  await Promise.all(promises);
}


