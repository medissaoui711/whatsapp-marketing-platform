import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { createAccountSchema } from '@repo/shared';
import { withAuthAndPermission, rateLimit, encrypt, decrypt, maskSensitiveConfig } from '@repo/auth';
import type { AuthContext } from '@repo/auth';

export const GET = withAuthAndPermission('accounts:read')(async (
  request: NextRequest,
  context: AuthContext
) => {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
  const status = searchParams.get('status');

  const where: Record<string, unknown> = { organizationId: context.tenantId };
  if (status) where.status = status;

  const [accounts, total] = await Promise.all([
    prisma.whatsAppAccount.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.whatsAppAccount.count({ where }),
  ]);

  const data = accounts.map((account) => {
    const item = { ...account } as Record<string, unknown>;
    try {
      if (item.accessToken) item.accessToken = decrypt(item.accessToken as string);
      if (item.appSecret) item.appSecret = decrypt(item.appSecret as string);
      if (item.webhookVerifyToken) item.webhookVerifyToken = decrypt(item.webhookVerifyToken as string);
    } catch {
      // keep encrypted values if decryption fails
    }
    return maskSensitiveConfig(item as Record<string, unknown>);
  });

  return NextResponse.json({
    data,
    pagination: {
      page, limit, total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
});

export const POST = withAuthAndPermission('accounts:create')(async (
  request: NextRequest,
  context: AuthContext
) => {
  const rateResult = await rateLimit(`account_create_${context.userId}`, 10, 60 * 1000);
  if (!rateResult.success) {
    return NextResponse.json({
      error: 'طلبات كثيرة جداً. حاول بعد ' + Math.ceil((rateResult.resetAt - Date.now()) / 1000) + ' ثانية',
      retryAfter: Math.ceil((rateResult.resetAt - Date.now()) / 1000),
    }, { status: 429 });
  }

  const body = await request.json();
  const validation = createAccountSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'فشل التحقق من صحة البيانات',
      details: validation.error.issues.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, { status: 400 });
  }

  const { name, phoneId, businessId, accessToken, appId, appSecret, webhookVerifyToken, apiVersion, isDefaultIncoming, isDefaultOutgoing, autoReadReceipt, businessCallingEnabled, status } = validation.data;

  const encryptedToken = encrypt(accessToken);
  const encryptedAppSecret = appSecret ? encrypt(appSecret) : undefined;
  const encryptedVerifyToken = webhookVerifyToken ? encrypt(webhookVerifyToken) : undefined;

  if (isDefaultIncoming) {
    await prisma.whatsAppAccount.updateMany({
      where: { organizationId: context.tenantId, isDefaultIncoming: true },
      data: { isDefaultIncoming: false },
    });
  }
  if (isDefaultOutgoing) {
    await prisma.whatsAppAccount.updateMany({
      where: { organizationId: context.tenantId, isDefaultOutgoing: true },
      data: { isDefaultOutgoing: false },
    });
  }

  const account = await prisma.whatsAppAccount.create({
    data: {
      organizationId: context.tenantId,
      name,
      phoneId,
      businessId,
      accessToken: encryptedToken,
      appId: appId ?? undefined,
      appSecret: encryptedAppSecret,
      webhookVerifyToken: encryptedVerifyToken,
      apiVersion,
      isDefaultIncoming,
      isDefaultOutgoing,
      autoReadReceipt,
      businessCallingEnabled,
      status,
      createdById: context.userId,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: context.tenantId,
      resourceType: 'whatsappAccount',
      resourceId: account.id,
      userId: context.userId,
      userName: context.email,
      action: 'created',
      changes: JSON.stringify([{ field: 'name', newValue: name }]),
    },
  });

  const response = maskSensitiveConfig({
    ...account,
    accessToken: accessToken,
    appSecret: appSecret ?? undefined,
    webhookVerifyToken: webhookVerifyToken ?? undefined,
  } as Record<string, unknown>);

  return NextResponse.json(response, { status: 201 });
});


