import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { CallRecorder } from './recorder/ogg-recorder';
import type { AudioBridge } from './audio-bridge';
import type { AudioPlayer } from './audio-player';

export interface OutgoingCallOptions {
  organizationId: string;
  agentId: string;
  contactId: string;
  contactPhone: string;
  accountName: string;
  recordingDir: string;
}

export class OutgoingCallManager extends EventEmitter {
  private callId: string | null = null;
  private callLogId: string | null = null;
  private status: string = 'initiating';
  private startedAt: Date = new Date();
  private answeredAt: Date | null = null;
  private callerRecorder: CallRecorder | null = null;
  private agentRecorder: CallRecorder | null = null;
  private bridge: AudioBridge | null = null;
  private ringbackPlayer: AudioPlayer | null = null;

  constructor(private options: OutgoingCallOptions) {
    super();
  }

  async initiate(_agentSDPOffer: string): Promise<{ callLogId: string; agentSDPAnswer: string }> {
    this.callLogId = randomUUID();
    this.callId = randomUUID();
    this.status = 'ringing';

    if (this.options.recordingDir) {
      this.callerRecorder = new CallRecorder(this.options.recordingDir);
      this.agentRecorder = new CallRecorder(this.options.recordingDir);
      await this.callerRecorder.init();
      await this.agentRecorder.init();
    }

    this.emit('initiated', { callId: this.callId, callLogId: this.callLogId });

    return {
      callLogId: this.callLogId,
      agentSDPAnswer: 'mock-sdp-answer',
    };
  }

  handleWebhook(event: string, sdpAnswer?: string): void {
    switch (event) {
      case 'ringing':
        this.status = 'ringing';
        this.startRingback();
        this.emit('ringing');
        break;
      case 'accepted':
      case 'in_call':
      case 'connect':
        this.status = 'answered';
        this.answeredAt = new Date();
        this.stopRingback();
        this.emit('answered', { answeredAt: this.answeredAt });
        break;
      case 'rejected':
        this.status = 'rejected';
        this.emit('rejected');
        this.cleanup().catch(() => {});
        break;
      case 'ended':
      case 'terminated':
      case 'terminate':
        this.status = 'completed';
        this.emit('ended');
        this.cleanup().catch(() => {});
        break;
    }

    if (sdpAnswer) {
      this.emit('sdp_answer', sdpAnswer);
    }
  }

  private startRingback(): void {
    this.emit('ringback_start');
  }

  private stopRingback(): void {
    this.emit('ringback_stop');
  }

  async hangup(): Promise<void> {
    await this.cleanup();
    this.emit('hangup_complete');
  }

  private async cleanup(): Promise<void> {
    if (this.bridge) {
      this.bridge.stop();
    }

    if (this.ringbackPlayer) {
      this.ringbackPlayer.stop();
    }

    if (this.callerRecorder) {
      await this.callerRecorder.stop();
      await this.callerRecorder.cleanup();
    }
    if (this.agentRecorder) {
      await this.agentRecorder.stop();
      await this.agentRecorder.cleanup();
    }
  }
}


