import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { updateAccountSchema } from '@repo/shared';
import { withAuthAndPermission, encrypt, decrypt, maskSensitiveConfig } from '@repo/auth';
import type { AuthContext } from '@repo/auth';

function sanitize(account: Record<string, unknown>) {
  const item = { ...account };
  try {
    if (item.accessToken) item.accessToken = decrypt(item.accessToken as string);
    if (item.appSecret) item.appSecret = decrypt(item.appSecret as string);
    if (item.webhookVerifyToken) item.webhookVerifyToken = decrypt(item.webhookVerifyToken as string);
  } catch {
    // keep encrypted
  }
  return maskSensitiveConfig(item);
}

export const GET = withAuthAndPermission('accounts:read')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  const account = await prisma.whatsAppAccount.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!account) {
    return NextResponse.json({ error: 'الحساب غير موجود' }, { status: 404 });
  }

  return NextResponse.json(sanitize(account as Record<string, unknown>));
});

export const PUT = withAuthAndPermission('accounts:update')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  const existing = await prisma.whatsAppAccount.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!existing) {
    return NextResponse.json({ error: 'الحساب غير موجود' }, { status: 404 });
  }

  const body = await request.json();
  const validation = updateAccountSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'فشل التحقق من صحة البيانات',
      details: validation.error.issues.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  const changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];
  const allowedFields = ['name', 'phoneId', 'businessId', 'appId', 'apiVersion', 'isDefaultIncoming', 'isDefaultOutgoing', 'autoReadReceipt', 'businessCallingEnabled', 'status'] as const;

  for (const field of allowedFields) {
    if (field in validation.data) {
      const val = (validation.data as Record<string, unknown>)[field];
      data[field] = val ?? null;

      const oldVal = (existing as Record<string, unknown>)[field];
      if (JSON.stringify(oldVal) !== JSON.stringify(val)) {
        changes.push({ field, oldValue: oldVal, newValue: val });
      }
    }
  }

  if (validation.data.accessToken) {
    data.accessToken = encrypt(validation.data.accessToken);
    changes.push({ field: 'accessToken', oldValue: '[encrypted]', newValue: '[updated]' });
  }
  if (validation.data.appSecret !== undefined) {
    data.appSecret = validation.data.appSecret ? encrypt(validation.data.appSecret) : null;
    changes.push({ field: 'appSecret', oldValue: '[encrypted]', newValue: validation.data.appSecret ? '[updated]' : '[removed]' });
  }
  if (validation.data.webhookVerifyToken !== undefined) {
    data.webhookVerifyToken = validation.data.webhookVerifyToken ? encrypt(validation.data.webhookVerifyToken) : null;
    changes.push({ field: 'webhookVerifyToken', oldValue: '[encrypted]', newValue: validation.data.webhookVerifyToken ? '[updated]' : '[removed]' });
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'لا توجد بيانات للتحديث' }, { status: 400 });
  }

  if (data.isDefaultIncoming) {
    await prisma.whatsAppAccount.updateMany({
      where: { organizationId: context.tenantId, id: { not: params.id }, isDefaultIncoming: true },
      data: { isDefaultIncoming: false },
    });
  }
  if (data.isDefaultOutgoing) {
    await prisma.whatsAppAccount.updateMany({
      where: { organizationId: context.tenantId, id: { not: params.id }, isDefaultOutgoing: true },
      data: { isDefaultOutgoing: false },
    });
  }

  data.updatedById = context.userId;

  const account = await prisma.whatsAppAccount.update({
    where: { id: params.id },
    data,
  });

  await prisma.auditLog.create({
    data: {
      organizationId: context.tenantId,
      resourceType: 'whatsappAccount',
      resourceId: account.id,
      userId: context.userId,
      userName: context.email,
      action: 'updated',
      changes: JSON.stringify(changes),
    },
  });

  return NextResponse.json(sanitize(account as Record<string, unknown>));
});

export const DELETE = withAuthAndPermission('accounts:delete')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  const account = await prisma.whatsAppAccount.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!account) {
    return NextResponse.json({ error: 'الحساب غير موجود' }, { status: 404 });
  }

  const hasActiveCampaigns = await prisma.bulkMessageCampaign.findFirst({
    where: {
      whatsappAccount: account.name,
      status: { in: ['processing', 'scheduled'] },
    },
  });

  if (hasActiveCampaigns) {
    return NextResponse.json({
      error: 'لا يمكن حذف حساب لديه حملات نشطة',
    }, { status: 400 });
  }

  await prisma.whatsAppAccount.delete({ where: { id: params.id } });

  await prisma.auditLog.create({
    data: {
      organizationId: context.tenantId,
      resourceType: 'whatsappAccount',
      resourceId: account.id,
      userId: context.userId,
      userName: context.email,
      action: 'deleted',
      changes: JSON.stringify([{ field: 'name', oldValue: account.name }]),
    },
  });

  return NextResponse.json({ success: true });
});
