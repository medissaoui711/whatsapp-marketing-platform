import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { createIntegrationSchema } from '@repo/shared';
import { withAuthAndPermission, rateLimit, encrypt, decrypt, maskSensitiveConfig } from '@repo/auth';
import type { AuthContext } from '@repo/auth';

export const GET = withAuthAndPermission('integrations:read')(async (
  request: NextRequest,
  context: AuthContext
) => {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
  const type = searchParams.get('type');

  const where: Record<string, unknown> = { tenantId: context.tenantId };
  if (type) where.type = type;

  const selectFields = context.role === 'viewer'
    ? { id: true, type: true, enabled: true, createdAt: true }
    : { id: true, type: true, config: true, enabled: true, createdAt: true, updatedAt: true };

  const [integrations, total] = await Promise.all([
    prisma.integration.findMany({
      where,
      select: selectFields,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.integration.count({ where }),
  ]);

  const data = integrations.map((integration) => {
    const item = { ...integration } as Record<string, unknown>;
    if (item.config && context.role !== 'viewer') {
      try {
        const decrypted = JSON.parse(decrypt(item.config as string));
        item.config = maskSensitiveConfig(decrypted as Record<string, unknown>);
      } catch {
        item.config = { masked: true };
      }
    }
    return item;
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

export const POST = withAuthAndPermission('integrations:create')(async (
  request: NextRequest,
  context: AuthContext
) => {
  const rateResult = await rateLimit(`integration_create_${context.userId}`, 20, 60 * 1000);
  if (!rateResult.success) {
    return NextResponse.json({
      error: 'طلبات كثيرة جداً. حاول بعد ' + Math.ceil((rateResult.resetAt - Date.now()) / 1000) + ' ثانية',
      retryAfter: Math.ceil((rateResult.resetAt - Date.now()) / 1000),
    }, { status: 429 });
  }

  const body = await request.json();
  const validation = createIntegrationSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'فشل التحقق من صحة البيانات',
      details: validation.error.issues.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, { status: 400 });
  }

  const configJson = JSON.stringify(validation.data.config);
  const encryptedConfig = encrypt(configJson);

  const integration = await prisma.integration.create({
    data: {
      type: validation.data.type,
      config: encryptedConfig,
      enabled: validation.data.enabled ?? true,
      tenantId: context.tenantId,
    },
  });

  void prisma.auditLog.create({
    data: {
      userId: context.userId,
      action: 'integration.create',
      target: `integration:${integration.id}`,
      details: JSON.stringify({ type: integration.type }),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      tenantId: context.tenantId,
    },
  });

  const response = {
    ...integration,
    config: maskSensitiveConfig(validation.data.config as Record<string, unknown>),
  };

  return NextResponse.json(response, { status: 201 });
});


