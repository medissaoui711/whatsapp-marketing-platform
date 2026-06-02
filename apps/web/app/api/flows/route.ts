import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { createFlowSchema } from '@repo/shared';
import type { FlowResponse } from '@repo/shared';
import { withAuthAndPermission, rateLimit } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import { logAudit } from '@repo/audit';

export const GET = withAuthAndPermission('flows:read')(async (
  request: NextRequest,
  context: AuthContext,
) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const accountName = searchParams.get('account') || '';
  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';

  const where: any = { organizationId: context.tenantId };
  if (accountName) where.whatsappAccount = accountName;
  if (status) where.status = status;
  if (search) where.name = { contains: search, mode: 'insensitive' };

  const [flows, total] = await Promise.all([
    prisma.whatsAppFlow.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.whatsAppFlow.count({ where }),
  ]);

  const result: FlowResponse[] = flows.map(flow => ({
    id: flow.id,
    whatsappAccount: flow.whatsappAccount,
    metaFlowId: flow.metaFlowId || '',
    name: flow.name,
    status: flow.status as any,
    category: flow.category || '',
    jsonVersion: flow.jsonVersion,
    flowJson: (flow.flowJson || {}) as Record<string, any>,
    screens: (flow.screens || []) as any[],
    previewUrl: flow.previewUrl || '',
    hasLocalChanges: flow.hasLocalChanges,
    createdAt: flow.createdAt.toISOString(),
    updatedAt: flow.updatedAt.toISOString(),
  }));

  return NextResponse.json({ flows: result, total, page, limit });
});

export const POST = withAuthAndPermission('flows:create')(async (
  request: NextRequest,
  context: AuthContext,
) => {
  const rateResult = await rateLimit(`flow_create_${context.userId}`, 10, 60 * 1000);
  if (!rateResult.success) {
    return NextResponse.json({
      error: 'طلبات كثيرة جداً',
      retryAfter: Math.ceil((rateResult.resetAt - Date.now()) / 1000),
    }, { status: 429 });
  }

  const body = await request.json();
  const validation = createFlowSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'فشل التحقق من صحة البيانات',
      details: validation.error.issues.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, { status: 400 });
  }

  const data = validation.data;

  const account = await prisma.whatsAppAccount.findFirst({
    where: { name: data.whatsappAccount, organizationId: context.tenantId },
  });

  if (!account) {
    return NextResponse.json({ error: 'حساب واتساب غير موجود' }, { status: 404 });
  }

  const flow = await prisma.whatsAppFlow.create({
    data: {
      organizationId: context.tenantId,
      whatsappAccount: data.whatsappAccount,
      name: data.name,
      status: 'DRAFT',
      category: data.category,
      jsonVersion: data.jsonVersion,
      flowJson: data.flowJson,
      screens: data.screens,
    },
  });

  await logAudit(
    context.userId, context.email,
    'whatsAppFlow', flow.id, 'created',
    [{ field: 'name', newValue: flow.name }],
    context.tenantId,
  );

  const response: FlowResponse = {
    id: flow.id,
    whatsappAccount: flow.whatsappAccount,
    metaFlowId: flow.metaFlowId || '',
    name: flow.name,
    status: flow.status as any,
    category: flow.category || '',
    jsonVersion: flow.jsonVersion,
    flowJson: (flow.flowJson || {}) as Record<string, any>,
    screens: (flow.screens || []) as any[],
    previewUrl: flow.previewUrl || '',
    hasLocalChanges: flow.hasLocalChanges,
    createdAt: flow.createdAt.toISOString(),
    updatedAt: flow.updatedAt.toISOString(),
  };

  return NextResponse.json({ flow: response }, { status: 201 });
});


