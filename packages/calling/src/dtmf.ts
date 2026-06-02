const DTMF_DIGITS: Record<number, string> = {
  0: '0', 1: '1', 2: '2', 3: '3', 4: '4',
  5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
  10: '*', 11: '#',
};

export function decodeDTMFEvent(
  eventId: number,
  endBit: boolean,
  lastEvent: number,
  lastEndBit: boolean
): { digit: string | null; detected: boolean } {
  const wasNewPress = endBit && (lastEvent !== eventId || !lastEndBit);

  if (wasNewPress && DTMF_DIGITS[eventId]) {
    return { digit: DTMF_DIGITS[eventId], detected: true };
  }

  return { digit: null, detected: false };
}

export function parseTelephoneEventPayload(payload: Buffer): { eventId: number; endBit: boolean; duration: number } {
  if (payload.length < 4) {
    throw new Error('Payload too short for telephone-event');
  }

  const eventId = payload[0];
  const endBit = (payload[1] & 0x80) !== 0;
  const duration = (payload[2] << 8) | payload[3];

  return { eventId, endBit, duration };
}


