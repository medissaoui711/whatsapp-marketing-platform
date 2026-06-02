import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import { logAudit } from '@repo/audit';
import type { FlowResponse } from '@repo/shared';

export const POST = withAuthAndPermission('flows:create')(async (
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

  const newFlow = await prisma.whatsAppFlow.create({
    data: {
      organizationId: context.tenantId,
      whatsappAccount: flow.whatsappAccount,
      name: `${flow.name} (نسخة)`,
      status: 'DRAFT',
      category: flow.category,
      jsonVersion: flow.jsonVersion,
      flowJson: flow.flowJson as any,
      screens: flow.screens as any,
    },
  });

  await logAudit(
    context.userId, context.email,
    'whatsAppFlow', newFlow.id, 'created',
    [{ field: 'name', newValue: newFlow.name }, { field: 'originalFlowId', oldValue: flow.id }],
    context.tenantId,
  );

  const response: FlowResponse = {
    id: newFlow.id,
    whatsappAccount: newFlow.whatsappAccount,
    metaFlowId: newFlow.metaFlowId || '',
    name: newFlow.name,
    status: newFlow.status as any,
    category: newFlow.category || '',
    jsonVersion: newFlow.jsonVersion,
    flowJson: (newFlow.flowJson || {}) as Record<string, any>,
    screens: (newFlow.screens || []) as any[],
    previewUrl: newFlow.previewUrl || '',
    hasLocalChanges: newFlow.hasLocalChanges,
    createdAt: newFlow.createdAt.toISOString(),
    updatedAt: newFlow.updatedAt.toISOString(),
  };

  return NextResponse.json({ flow: response, message: 'تم نسخ التدفق بنجاح' });
});
