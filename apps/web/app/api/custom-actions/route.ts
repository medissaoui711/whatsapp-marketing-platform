import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { createCustomActionSchema } from '@repo/shared';
import type { CustomActionResponse } from '@repo/shared';
import { withAuthAndPermission, rateLimit } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import { logAudit } from '@repo/audit';

export const GET = withAuthAndPermission('custom_actions:read')(async (
  request: NextRequest,
  context: AuthContext,
) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const search = searchParams.get('search') || '';

  const where: any = { organizationId: context.tenantId };
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  const [actions, total] = await Promise.all([
    prisma.customAction.findMany({
      where,
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customAction.count({ where }),
  ]);

  const result: CustomActionResponse[] = actions.map(action => ({
    id: action.id,
    name: action.name,
    icon: action.icon || '',
    actionType: action.actionType as any,
    config: action.config as Record<string, any>,
    isActive: action.isActive,
    displayOrder: action.displayOrder,
    createdAt: action.createdAt.toISOString(),
    updatedAt: action.updatedAt.toISOString(),
  }));

  return NextResponse.json({
    customActions: result,
    total,
    page,
    limit,
  });
});

export const POST = withAuthAndPermission('custom_actions:create')(async (
  request: NextRequest,
  context: AuthContext,
) => {
  const rateResult = await rateLimit(`custom_action_create_${context.userId}`, 20, 60 * 1000);
  if (!rateResult.success) {
    return NextResponse.json({
      error: 'طلبات كثيرة جداً',
      retryAfter: Math.ceil((rateResult.resetAt - Date.now()) / 1000),
    }, { status: 429 });
  }

  const body = await request.json();
  const validation = createCustomActionSchema.safeParse(body);

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

  const action = await prisma.customAction.create({
    data: {
      organizationId: context.tenantId,
      name: data.name,
      icon: data.icon || '',
      actionType: data.actionType,
      config: data.config as any,
      isActive: data.isActive ?? true,
      displayOrder: data.displayOrder ?? 0,
    },
  });

  await logAudit(
    context.userId,
    context.email,
    'custom_action',
    action.id,
    'created',
    [{ field: 'name', newValue: action.name }],
    context.tenantId,
  );

  const response: CustomActionResponse = {
    id: action.id,
    name: action.name,
    icon: action.icon || '',
    actionType: action.actionType as any,
    config: action.config as Record<string, any>,
    isActive: action.isActive,
    displayOrder: action.displayOrder,
    createdAt: action.createdAt.toISOString(),
    updatedAt: action.updatedAt.toISOString(),
  };

  return NextResponse.json(response, { status: 201 });
});


