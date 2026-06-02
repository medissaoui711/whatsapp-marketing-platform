import { EventEmitter } from 'events';

export interface RTPPacket {
  sequenceNumber: number;
  timestamp: number;
  ssrc: number;
  payload: Buffer;
}

interface RTPPacketSource {
  read(): Promise<{ done: boolean; value: RTPPacket }>;
}

interface RTPPacketSink {
  write(packet: RTPPacket): Promise<void>;
}

interface CallRecorder {
  writePacket(payload: Buffer): void;
  close(): Promise<void>;
}

export class AudioBridge extends EventEmitter {
  private stopFlag = false;
  private callerRecorder: CallRecorder | null;
  private agentRecorder: CallRecorder | null;
  private lastCallerSeq = 0;
  private lastCallerTS = 0;
  private seqOffset = 0;
  private tsOffset = 0;
  private firstAgentSeq = true;
  private agentBaseSeq = 0;
  private agentBaseTS = 0;

  constructor(callerRecorder?: CallRecorder, agentRecorder?: CallRecorder) {
    super();
    this.callerRecorder = callerRecorder ?? null;
    this.agentRecorder = agentRecorder ?? null;
  }

  public seedSequence(seq: number, ts: number): void {
    this.seqOffset = seq;
    this.tsOffset = ts;
    this.firstAgentSeq = true;
  }

  public start(
    callerRemote: RTPPacketSource | null,
    agentLocal: RTPPacketSink | null,
    agentRemote: RTPPacketSource | null,
    callerLocal: RTPPacketSink | null
  ): Promise<void[]> {
    const promises: Promise<void>[] = [];

    if (callerRemote && agentLocal) {
      promises.push(this.forward(callerRemote, agentLocal, this.callerRecorder, false));
    }

    if (agentRemote && callerLocal) {
      promises.push(this.forward(agentRemote, callerLocal, this.agentRecorder, true));
    }

    return Promise.all(promises);
  }

  private async forward(
    source: RTPPacketSource,
    destination: RTPPacketSink,
    recorder: CallRecorder | null,
    trackSeq: boolean
  ): Promise<void> {
    try {
      while (!this.stopFlag) {
        const { done, value: packet } = await source.read();
        if (done) break;

        let finalPacket = packet;

        if (trackSeq) {
          if (this.firstAgentSeq) {
            this.agentBaseSeq = packet.sequenceNumber;
            this.agentBaseTS = packet.timestamp;
            this.firstAgentSeq = false;
          }

          if (this.seqOffset > 0) {
            finalPacket = {
              ...packet,
              sequenceNumber: this.seqOffset + (packet.sequenceNumber - this.agentBaseSeq) + 1,
              timestamp: this.tsOffset + (packet.timestamp - this.agentBaseTS) + 960,
            };
            this.lastCallerSeq = finalPacket.sequenceNumber;
            this.lastCallerTS = finalPacket.timestamp;
          } else {
            this.lastCallerSeq = packet.sequenceNumber;
            this.lastCallerTS = packet.timestamp;
          }
        }

        if (recorder && finalPacket.payload.length > 0) {
          recorder.writePacket(finalPacket.payload);
        }

        await destination.write(finalPacket);
      }
    } finally {
      // no cleanup needed
    }
  }

  public stop(): void {
    this.stopFlag = true;
  }

  public getLastCallerSeq(): { seq: number; ts: number } {
    return { seq: this.lastCallerSeq, ts: this.lastCallerTS };
  }
}


