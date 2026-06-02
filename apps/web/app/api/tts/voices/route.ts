import { NextResponse } from 'next/server';
import { withAuthAndPermission } from '@repo/auth/with-auth';

const AVAILABLE_VOICES = [
  { id: 'en_US-lessac', name: 'English (US) - Lessac', gender: 'female', language: 'en-US' },
  { id: 'en_US-amy', name: 'English (US) - Amy', gender: 'female', language: 'en-US' },
  { id: 'en_US-joe', name: 'English (US) - Joe', gender: 'male', language: 'en-US' },
  { id: 'en_GB-alan', name: 'English (GB) - Alan', gender: 'male', language: 'en-GB' },
  { id: 'ar_SA-ali', name: 'Arabic (SA) - Ali', gender: 'male', language: 'ar-SA' },
  { id: 'ar_SA-laila', name: 'Arabic (SA) - Laila', gender: 'female', language: 'ar-SA' },
];

export const GET = withAuthAndPermission('tts:read', async () => {
  return NextResponse.json({ voices: AVAILABLE_VOICES });
});



