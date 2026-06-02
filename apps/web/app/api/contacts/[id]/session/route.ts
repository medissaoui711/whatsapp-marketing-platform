import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import type { ContactSessionDataResponse } from '@repo/shared';

export const GET = withAuthAndPermission('contacts:read')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const contact = await prisma.contact.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!contact) {
    return NextResponse.json({ error: 'جهة الاتصال غير موجودة' }, { status: 404 });
  }

  const session = await prisma.chatbotSession.findFirst({
    where: {
      contactId: contact.id,
      organizationId: context.tenantId,
      status: { in: ['active', 'completed'] },
    },
    orderBy: { startedAt: 'desc' },
  });

  const response: ContactSessionDataResponse = {
    sessionData: {},
    panelConfig: {},
  };

  if (session) {
    response.sessionId = session.id;
  }

  return NextResponse.json(response);
});
