import { readFile } from 'fs/promises';
import { EventEmitter } from 'events';

interface RTPPacket {
  sequenceNumber: number;
  timestamp: number;
  ssrc: number;
  payload: Buffer;
}

interface RTPPacketSink {
  write(packet: RTPPacket): Promise<void>;
}

const OGG_PAGE_HEADER_LEN = 27;
const SAMPLES_PER_FRAME = 960;

export class AudioPlayer extends EventEmitter {
  private stopFlag = false;
  private sequenceNumber = 0;
  private timestamp = 0;
  private writer: RTPPacketSink;

  constructor(writer: RTPPacketSink) {
    super();
    this.writer = writer;
  }

  public setSequence(seq: number, ts: number): void {
    this.sequenceNumber = seq + 1;
    this.timestamp = ts + SAMPLES_PER_FRAME;
  }

  public getSequence(): { seq: number; ts: number } {
    return { seq: this.sequenceNumber, ts: this.timestamp };
  }

  public async playFile(filePath: string): Promise<number> {
    const packets = await this.readOpusPackets(filePath);
    let packetCount = 0;

    for (const opusData of packets) {
      if (this.stopFlag) break;

      const rtpPacket: RTPPacket = {
        sequenceNumber: this.sequenceNumber,
        timestamp: this.timestamp,
        ssrc: 1,
        payload: opusData,
      };

      await this.writer.write(rtpPacket);

      this.sequenceNumber++;
      this.timestamp += SAMPLES_PER_FRAME;
      packetCount++;
    }

    return packetCount;
  }

  public async playFileLoop(filePath: string): Promise<void> {
    while (!this.stopFlag) {
      await this.playFile(filePath);
      await this.sleep(100);
    }
  }

  public async playSilence(durationMs: number): Promise<void> {
    const silencePayload = Buffer.from([0xF8, 0xFF, 0xFE]);
    const startTime = Date.now();

    while (!this.stopFlag && Date.now() - startTime < durationMs) {
      const rtpPacket: RTPPacket = {
        sequenceNumber: this.sequenceNumber,
        timestamp: this.timestamp,
        ssrc: 1,
        payload: silencePayload,
      };

      await this.writer.write(rtpPacket);
      this.sequenceNumber++;
      this.timestamp += SAMPLES_PER_FRAME;

      await this.sleep(20);
    }
  }

  public stop(): void {
    this.stopFlag = true;
    this.emit('stopped');
  }

  public isStopped(): boolean {
    return this.stopFlag;
  }

  public resetAfterInterrupt(): void {
    this.stopFlag = false;
    this.emit('reset');
  }

  private async readOpusPackets(filePath: string): Promise<Buffer[]> {
    const data = await readFile(filePath);
    const packets: Buffer[] = [];

    let offset = 0;
    let headersSkipped = 0;

    while (offset + OGG_PAGE_HEADER_LEN <= data.length) {
      const header = data.subarray(offset, offset + OGG_PAGE_HEADER_LEN);

      const signature = header.toString('ascii', 0, 4);
      if (signature !== 'OggS') break;

      const segmentsCount = header[26];
      offset += OGG_PAGE_HEADER_LEN;

      if (offset + segmentsCount > data.length) break;
      const segTable = data.subarray(offset, offset + segmentsCount);
      offset += segmentsCount;

      let payloadSize = 0;
      for (const segSize of segTable) {
        payloadSize += segSize;
      }

      if (offset + payloadSize > data.length) break;
      const payload = data.subarray(offset, offset + payloadSize);
      offset += payloadSize;

      if (headersSkipped < 2) {
        headersSkipped++;
        continue;
      }

      let payloadOffset = 0;
      let currentPacket: Buffer[] = [];

      for (const segSize of segTable) {
        const size = segSize;
        currentPacket.push(payload.subarray(payloadOffset, payloadOffset + size));
        payloadOffset += size;

        if (segSize < 255) {
          if (currentPacket.length > 0) {
            packets.push(Buffer.concat(currentPacket));
          }
          currentPacket = [];
        }
      }

      if (currentPacket.length > 0) {
        packets.push(Buffer.concat(currentPacket));
      }
    }

    return packets;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}


