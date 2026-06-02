import { createWriteStream, WriteStream } from 'fs';
import { mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const OGG_PAGE_HEADER_LEN = 27;
const SAMPLES_PER_FRAME = 960;
const MAX_PAGE_PACKETS = 48;

const oggCRCTable: number[] = [];

for (let i = 0; i < 256; i++) {
  let r = i << 24;
  for (let j = 0; j < 8; j++) {
    if ((r & 0x80000000) !== 0) {
      r = (r << 1) ^ 0x04C11DB7;
    } else {
      r <<= 1;
    }
  }
  oggCRCTable[i] = r >>> 0;
}

function oggCRC32(data: Buffer): number {
  let crc = 0;
  for (const b of data) {
    crc = ((crc << 8) ^ oggCRCTable[((crc >>> 24) ^ b) & 0xFF]) >>> 0;
  }
  return crc;
}

export class CallRecorder {
  private filePath: string;
  private writeStream!: WriteStream;
  private granulePos = 0;
  private pageSeqNo = 0;
  private pageBuf: Buffer[] = [];
  private pageBufBytes = 0;
  private packetCount = 0;
  private stopped = false;
  private writeError: Error | null = null;
  private closed = false;

  constructor(recordingDir: string) {
    const filename = `recording_${randomUUID()}.ogg`;
    this.filePath = join(recordingDir, filename);
  }

  async init(): Promise<void> {
    const dir = this.filePath.substring(0, this.filePath.replace(/\\/g, '/').lastIndexOf('/'));
    await mkdir(dir, { recursive: true });
    this.writeStream = createWriteStream(this.filePath);
    await this.writeHeaders();
  }

  private async writeHeaders(): Promise<void> {
    const opusHead = Buffer.alloc(19);
    opusHead.write('OpusHead', 0);
    opusHead[8] = 1;
    opusHead[9] = 1;
    opusHead.writeUInt16LE(0, 10);
    opusHead.writeUInt32LE(48000, 12);
    opusHead.writeUInt16LE(0, 16);
    opusHead[18] = 0;

    await this.writePage(opusHead, true, false, 0);

    const vendor = 'whatomate';
    const opusTags = Buffer.alloc(8 + 4 + vendor.length + 4);
    opusTags.write('OpusTags', 0);
    opusTags.writeUInt32LE(vendor.length, 8);
    opusTags.write(vendor, 12);
    opusTags.writeUInt32LE(0, 12 + vendor.length);

    await this.writePage(opusTags, false, false, 0);
  }

  private writePage(payload: Buffer, bos: boolean, eos: boolean, granule: number): Promise<void> {
    const segTable: number[] = [];
    let remaining = payload.length;
    while (remaining >= 255) {
      segTable.push(255);
      remaining -= 255;
    }
    segTable.push(remaining);

    const headerSize = OGG_PAGE_HEADER_LEN + segTable.length;
    const page = Buffer.alloc(headerSize + payload.length);

    page.write('OggS', 0);
    page[4] = 0;
    page[5] = (bos ? 0x02 : 0) | (eos ? 0x04 : 0);
    page.writeBigUInt64LE(BigInt(granule), 6);
    page.writeUInt32LE(0, 14);
    page.writeUInt32LE(this.pageSeqNo, 18);
    page[26] = segTable.length;

    let offset = OGG_PAGE_HEADER_LEN;
    for (const seg of segTable) {
      page[offset++] = seg;
    }

    payload.copy(page, offset);

    page.writeUInt32LE(0, 22);
    const checksum = oggCRC32(page);
    page.writeUInt32LE(checksum, 22);

    return new Promise<void>((resolve, reject) => {
      this.writeStream.write(page, (err?: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private async flushPage(lastPage: boolean): Promise<void> {
    if (this.pageBuf.length === 0) return;

    const segTable: number[] = [];
    for (const pkt of this.pageBuf) {
      let remaining = pkt.length;
      while (remaining >= 255) {
        segTable.push(255);
        remaining -= 255;
      }
      segTable.push(remaining);
    }

    this.granulePos += this.pageBuf.length * SAMPLES_PER_FRAME;

    const payload = Buffer.concat(this.pageBuf);

    const headerSize = OGG_PAGE_HEADER_LEN + segTable.length;
    const page = Buffer.alloc(headerSize + payload.length);

    page.write('OggS', 0);
    page[4] = 0;
    page[5] = lastPage ? 0x04 : 0;
    page.writeBigUInt64LE(BigInt(this.granulePos), 6);
    page.writeUInt32LE(0, 14);
    page.writeUInt32LE(this.pageSeqNo, 18);
    page[26] = segTable.length;

    let offset = OGG_PAGE_HEADER_LEN;
    for (const seg of segTable) {
      page[offset++] = seg;
    }

    payload.copy(page, offset);

    page.writeUInt32LE(0, 22);
    const checksum = oggCRC32(page);
    page.writeUInt32LE(checksum, 22);

    return new Promise<void>((resolve, reject) => {
      this.writeStream.write(page, (err?: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async writePacket(opusData: Buffer): Promise<void> {
    if (this.stopped) return;

    const pkt = Buffer.from(opusData);
    this.pageBuf.push(pkt);
    this.pageBufBytes += pkt.length;
    this.packetCount++;

    if (this.pageBuf.length >= MAX_PAGE_PACKETS) {
      await this.flushPage(false);
      this.pageSeqNo++;
      this.pageBuf = [];
      this.pageBufBytes = 0;
    }
  }

  async stop(): Promise<{ path: string; packetCount: number; error: Error | null }> {
    if (this.stopped) {
      return { path: this.filePath, packetCount: this.packetCount, error: this.writeError };
    }
    this.stopped = true;

    if (this.pageBuf.length > 0) {
      await this.flushPage(true);
      this.pageSeqNo++;
      this.pageBuf = [];
      this.pageBufBytes = 0;
    }

    return new Promise((resolve) => {
      this.writeStream.end(() => {
        this.closed = true;
        resolve({ path: this.filePath, packetCount: this.packetCount, error: this.writeError });
      });
    });
  }

  async cleanup(): Promise<void> {
    if (!this.closed) {
      await new Promise<void>((resolve) => {
        this.writeStream.end(resolve);
      });
    }
    await unlink(this.filePath).catch(() => {});
  }
}


