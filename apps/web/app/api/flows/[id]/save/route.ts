import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import { WhatsAppClient } from '@repo/integrations';
import { logAudit } from '@repo/audit';
import type { FlowResponse } from '@repo/shared';
import { validateFlowStructure } from '@repo/shared/src/helpers/flow';

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

  if (flow.status === 'DEPRECATED') {
    return NextResponse.json({ error: 'لا يمكن تحديث التدفقات الملغاة' }, { status: 400 });
  }

  const account = await prisma.whatsAppAccount.findFirst({
    where: { name: flow.whatsappAccount, organizationId: context.tenantId },
  });

  if (!account) {
    return NextResponse.json({ error: 'حساب واتساب غير موجود' }, { status: 404 });
  }

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

  let metaFlowId = flow.metaFlowId || '';

  if (!metaFlowId) {
    const categories = flow.category ? [flow.category] : [];
    metaFlowId = await client.createFlow(waAccount, flow.name, categories);
  }

  if (flow.screens && (flow.screens as any[]).length > 0) {
    const screens = flow.screens as any[];

    const validationError = validateFlowStructure(screens);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const flowJSON = {
      version: flow.jsonVersion,
      screens,
    };

    await client.updateFlowJSON(waAccount, metaFlowId, flowJSON);
  }

  const updated = await prisma.whatsAppFlow.update({
    where: { id: params.id },
    data: { metaFlowId, status: 'DRAFT', hasLocalChanges: false },
  });

  await logAudit(
    context.userId, context.email,
    'whatsAppFlow', flow.id, 'updated',
    [{ field: 'metaFlowId', newValue: metaFlowId }],
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

  return NextResponse.json({ flow: response, message: 'تم حفظ التدفق في Meta بنجاح' });
});
