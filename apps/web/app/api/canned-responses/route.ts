import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { createCannedResponseSchema } from '@repo/shared';
import { withAuthAndPermission, rateLimit } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import type { CannedResponseResponse } from '@repo/shared';
import { logAudit } from '@repo/audit';

export const GET = withAuthAndPermission('canned_responses:read')(async (
  request: NextRequest,
  context: AuthContext,
) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const search = searchParams.get('search');
  const category = searchParams.get('category');
  const isActive = searchParams.get('isActive');

  const where: any = { organizationId: context.tenantId };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
      { shortcut: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (category) {
    where.category = category;
  }
  if (isActive === 'true') {
    where.isActive = true;
  } else if (isActive === 'false') {
    where.isActive = false;
  }

  const [cannedResponses, total, categories] = await Promise.all([
    prisma.cannedResponse.findMany({
      where,
      include: {
        createdBy: { select: { fullName: true } },
      },
      orderBy: [{ usageCount: 'desc' }, { updatedAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.cannedResponse.count({ where }),
    prisma.cannedResponse.findMany({
      where: { organizationId: context.tenantId, category: { not: null } },
      select: { category: true },
      distinct: ['category'],
    }),
  ]);

  const response: CannedResponseResponse[] = cannedResponses.map((cr) => ({
    id: cr.id,
    name: cr.name,
    shortcut: cr.shortcut,
    content: cr.content,
    category: cr.category,
    isActive: cr.isActive,
    usageCount: cr.usageCount,
    buttons: cr.buttons as any,
    createdById: cr.createdById,
    createdByName: cr.createdBy?.fullName ?? null,
    createdAt: cr.createdAt.toISOString(),
    updatedAt: cr.updatedAt.toISOString(),
  }));

  return NextResponse.json({
    cannedResponses: response,
    categories: categories.map((c) => c.category).filter(Boolean) as string[],
    total,
    page,
    limit,
  });
});

export const POST = withAuthAndPermission('canned_responses:create')(async (
  request: NextRequest,
  context: AuthContext,
) => {
  const rateResult = await rateLimit(`canned_response_create_${context.userId}`, 30, 60 * 1000);
  if (!rateResult.success) {
    return NextResponse.json({
      error: 'طلبات كثيرة جداً',
      retryAfter: Math.ceil((rateResult.resetAt - Date.now()) / 1000),
    }, { status: 429 });
  }

  const body = await request.json();
  const validation = createCannedResponseSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'فشل التحقق من صحة البيانات',
      details: validation.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, { status: 400 });
  }

  const data = validation.data;

  let shortcut = data.shortcut?.trim() || null;
  if (shortcut) {
    const existing = await prisma.cannedResponse.findFirst({
      where: { organizationId: context.tenantId, shortcut },
    });
    if (existing) {
      return NextResponse.json({ error: 'الاختصار مستخدم مسبقاً' }, { status: 409 });
    }
  }

  const cannedResponse = await prisma.cannedResponse.create({
    data: {
      organizationId: context.tenantId,
      name: data.name,
      shortcut,
      content: data.content,
      category: data.category?.trim() || null,
      isActive: data.isActive,
      buttons: data.buttons as any,
      createdById: context.userId,
    },
    include: {
      createdBy: { select: { fullName: true } },
    },
  });

  await logAudit(
    context.userId,
    context.email,
    'cannedResponse',
    cannedResponse.id,
    'created',
    [{ field: 'name', newValue: cannedResponse.name }],
    context.tenantId,
  );

  const response: CannedResponseResponse = {
    id: cannedResponse.id,
    name: cannedResponse.name,
    shortcut: cannedResponse.shortcut,
    content: cannedResponse.content,
    category: cannedResponse.category,
    isActive: cannedResponse.isActive,
    usageCount: cannedResponse.usageCount,
    buttons: cannedResponse.buttons as any,
    createdById: cannedResponse.createdById,
    createdByName: cannedResponse.createdBy?.fullName ?? null,
    createdAt: cannedResponse.createdAt.toISOString(),
    updatedAt: cannedResponse.updatedAt.toISOString(),
  };

  return NextResponse.json(response, { status: 201 });
});


