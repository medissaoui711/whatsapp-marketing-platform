import { z } from 'zod';

export type CallDirection = 'incoming' | 'outgoing';
export type CallStatus =
  | 'ringing'
  | 'answered'
  | 'completed'
  | 'missed'
  | 'rejected'
  | 'failed'
  | 'transferring'
  | 'initiating'
  | 'accepted';
export type DisconnectedBy = 'client' | 'agent' | 'system';
export type CallTransferStatus = 'waiting' | 'connected' | 'completed' | 'abandoned' | 'no_answer';
export type CallPermissionStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface CallEvent {
  id: string;
  from: string;
  fromUserId?: string;
  to: string;
  toUserId?: string;
  timestamp: string;
  type: string;
  event: string;
  direction?: string;
  session?: {
    sdpType: string;
    sdp: string;
  };
  error?: {
    code: number;
    message: string;
  };
  duration?: number;
  bizOpaqueCallbackData?: string;
}

export interface CallPermissionReplyData {
  response: string;
  isPermanent: boolean;
  expirationTimestamp?: number;
  responseSource: string;
}


