import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndPermission } from '@repo/auth';
import { logAudit } from '@repo/audit';
import { prisma } from '@repo/db';
import { tagSchema } from '@repo/shared';
import { getTagsCached, invalidateTagsCache } from '@repo/cache';

export const GET = withAuthAndPermission('tags:read')(async (request: NextRequest, context) => {
  try {
    const { tenantId } = context;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const skip = (page - 1) * limit;

    const cached = await getTagsCached(tenantId);
    let filtered = cached;
    if (search) {
      const lower = search.toLowerCase();
      filtered = cached.filter((t) => t.name.toLowerCase().includes(lower));
    }

    const total = filtered.length;
    const paged = filtered.slice(skip, skip + limit);

    const contactCounts = await prisma.contact.groupBy({
      by: ['tags'],
      where: { organizationId: tenantId },
      _count: { id: true },
    });

    const countMap = new Map<string, number>();
    for (const group of contactCounts) {
      const tags = group.tags as string[];
      if (Array.isArray(tags)) {
        for (const tag of tags) {
          countMap.set(tag, (countMap.get(tag) || 0) + group._count.id);
        }
      }
    }

    const data = paged.map((t) => ({
      name: t.name,
      color: t.color || null,
      contactCount: countMap.get(t.name) || 0,
    }));

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Tags list error:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
});

export const POST = withAuthAndPermission('tags:create')(async (request: NextRequest, context) => {
  try {
    const { tenantId, userId, email } = context;
    const body = await request.json();
    const validation = tagSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'بيانات غير صحيحة',
        details: validation.error.issues.map((e: any) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      }, { status: 400 });
    }

    const { name, color } = validation.data;

    const existing = await prisma.tag.findUnique({
      where: { organizationId_name: { organizationId: tenantId, name } },
    });

    if (existing) {
      return NextResponse.json({ error: 'Tag already exists' }, { status: 409 });
    }

    const tag = await prisma.tag.create({
      data: { organizationId: tenantId, name, color },
    });

    await invalidateTagsCache(tenantId);

    await logAudit(
      userId, email, 'Tag', tag.name,
      'created', [{ field: 'name', newValue: name }, { field: 'color', newValue: color }], tenantId,
    );

    return NextResponse.json({
      name: tag.name,
      color: tag.color,
      contactCount: 0,
    }, { status: 201 });
  } catch (error) {
    console.error('Tags create error:', error);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
});


