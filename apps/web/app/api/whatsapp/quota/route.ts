import { NextResponse } from 'next/server';
import { withAuth } from '@repo/auth';
import { EducationalMessagingService } from '@repo/integrations/whatsapp/educational-message';

export const GET = withAuth(async (request, context) => {
  try {
    const service = new EducationalMessagingService();
    const quota = await service.getRemainingQuota(context.tenantId);

    return NextResponse.json(quota);
  } catch (error) {
    console.error('Failed to fetch quota:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
