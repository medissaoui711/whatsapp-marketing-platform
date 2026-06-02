import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import { WhatsAppClient } from '@repo/integrations';
import { logAudit } from '@repo/audit';
import type { FlowResponse } from '@repo/shared';

export const POST = withAuthAndPermission('flows:update')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const flow = await prisma.whatsAppFlow.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!flow) {
    return NextResponse.json({ error: 'التدفق غير موجود' }, { status: 404 });
  }

  if (flow.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'يمكن إلغاء نشر التدفقات المنشورة فقط' }, { status: 400 });
  }

  if (flow.metaFlowId) {
    const account = await prisma.whatsAppAccount.findFirst({
      where: { name: flow.whatsappAccount, organizationId: context.tenantId },
    });

    if (account) {
      const { decrypt } = await import('@repo/auth');
      const accessToken = decrypt(account.accessToken);

      const client = new WhatsAppClient();
      const waAccount = {
        phoneId: account.phoneId,
        businessId: account.businessId,
        apiVersion: account.apiVersion,
        accessToken,
        appId: account.appId || '',
      };

      try {
        await client.deprecateFlow(waAccount, flow.metaFlowId);
      } catch (error) {
        console.error('Failed to deprecate flow in Meta:', error);
      }
    }
  }

  const updated = await prisma.whatsAppFlow.update({
    where: { id: params.id },
    data: { status: 'DEPRECATED' },
  });

  await logAudit(
    context.userId, context.email,
    'whatsAppFlow', flow.id, 'updated',
    [{ field: 'status', newValue: 'DEPRECATED' }],
    context.tenantId,
  );

  const response: FlowResponse = {
    id: updated.id,
    whatsappAccount: updated.whatsappAccount,
    metaFlowId: updated.metaFlowId || '',
    name: updated.name,
    status: updated.status as any,
    category: updated.category || '',
    jsonVersion: updated.jsonVersion,
    flowJson: (updated.flowJson || {}) as Record<string, any>,
    screens: (updated.screens || []) as any[],
    previewUrl: updated.previewUrl || '',
    hasLocalChanges: updated.hasLocalChanges,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };

  return NextResponse.json({ flow: response, message: 'تم إلغاء نشر التدفق' });
});
