import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@repo/auth';
import { groupJoinService } from '@repo/integrations/whatsapp/groups/join-service';
import { z } from 'zod';

const consentSchema = z.object({
  consent: z.boolean(),
});

export const POST = withAuth(async (request, context) => {
  try {
    const body = await request.json();
    const validation = consentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid consent value' }, { status: 400 });
    }

    if (!validation.data.consent) {
      return NextResponse.json(
        { error: 'Consent is required to join WhatsApp groups' },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || '';
    const consent = await groupJoinService.recordConsent(
      context.tenantId,
      context.userId,
      context.email,
      ipAddress
    );

    return NextResponse.json({
      success: true,
      message: 'Consent recorded successfully',
      consent,
    });
  } catch (error) {
    console.error('Consent error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const GET = withAuth(async (request, context) => {
  try {
    const hasConsent = await groupJoinService.hasConsent(context.tenantId, context.userId);
    return NextResponse.json({ hasConsent });
  } catch (error) {
    console.error('Check consent error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
