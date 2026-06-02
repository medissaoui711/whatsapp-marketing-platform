import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndPermission } from '@repo/auth/with-auth';
import { getTTSManager } from '@/lib/tts';
import { prisma } from '@repo/db';
import { z } from 'zod';

const synthesizeSchema = z.object({
  text: z.string().min(1).max(5000),
  lengthScale: z.number().min(0.5).max(2.0).optional(),
  noiseScale: z.number().min(0.0).max(1.0).optional(),
  noiseWScale: z.number().min(0.0).max(1.0).optional(),
  speakerId: z.number().int().min(0).optional(),
});

export const POST = withAuthAndPermission('tts:write', async (req: NextRequest) => {
  const body = await req.json();
  const parsed = synthesizeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { text, ...options } = parsed.data;
  const ttsManager = getTTSManager();

  try {
    const filePath = await ttsManager.synthesize(text, Object.keys(options).length > 0 ? options : undefined);
    const fileName = filePath.split('\\').pop()?.split('/').pop();

    const { readFile } = await import('fs/promises');
    const audioBuffer = await readFile(filePath);

    await prisma.auditLog.create({
      data: {
        organizationId: req.organizationId,
        resourceType: 'tts',
        resourceId: 'synthesize',
        userId: req.userId,
        userName: req.userName,
        action: 'created',
        changes: { textLength: text.length },
      },
    });

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/ogg',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('TTS synthesis failed:', error);
    return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 });
  }
});



