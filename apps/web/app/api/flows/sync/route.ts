import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import { WhatsAppClient } from '@repo/integrations';
import { logAudit } from '@repo/audit';
import { syncFlowsSchema } from '@repo/shared';

export const POST = withAuthAndPermission('flows:sync')(async (
  request: NextRequest,
  context: AuthContext,
) => {
  const body = await request.json();
  const validation = syncFlowsSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'فشل التحقق من صحة البيانات',
      details: validation.error.issues.map((e: any) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, { status: 400 });
  }

  const { whatsappAccount } = validation.data;

  const account = await prisma.whatsAppAccount.findFirst({
    where: { name: whatsappAccount, organizationId: context.tenantId },
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

  const metaFlows = await client.listFlows(waAccount) as any[];

  let created = 0;
  let updatedCount = 0;

  for (const mf of metaFlows) {
    const existing = await prisma.whatsAppFlow.findFirst({
      where: { organizationId: context.tenantId, metaFlowId: mf.id },
    });

    const category = mf.categories?.[0] || '';

    if (!existing) {
      await prisma.whatsAppFlow.create({
        data: {
          organizationId: context.tenantId,
          whatsappAccount,
          metaFlowId: mf.id,
          name: mf.name,
          status: mf.status || 'DRAFT',
          category,
          previewUrl: mf.preview?.link || '',
        },
      });
      created++;
    } else {
      await prisma.whatsAppFlow.update({
        where: { id: existing.id },
        data: {
          name: mf.name,
          status: mf.status || 'DRAFT',
          category,
          previewUrl: mf.preview?.link || '',
        },
      });
      updatedCount++;
    }
  }

  await logAudit(
    context.userId, context.email,
    'whatsAppFlow', 'sync', 'updated',
    [{ field: 'synced', newValue: String(metaFlows.length) }],
    context.tenantId,
  );

  return NextResponse.json({
    message: 'تم مزامنة التدفقات بنجاح',
    synced: metaFlows.length,
    created,
    updated: updatedCount,
  });
});


