import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndPermission } from '@repo/auth';
import { logAudit } from '@repo/audit';
import { prisma } from '@repo/db';
import { updateTagSchema } from '@repo/shared';
import { invalidateTagsCache } from '@repo/cache';

export const PUT = withAuthAndPermission('tags:update')(async (
  request: NextRequest,
  context,
  { params }: { params: { name: string } },
) => {
  try {
    const { tenantId, userId, email } = context;
    const { name: oldName } = params;

    const body = await request.json();
    const validation = updateTagSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'بيانات غير صحيحة',
        details: validation.error.issues.map((e: any) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      }, { status: 400 });
    }

    const { name: newName, color } = validation.data;

    const existing = await prisma.tag.findUnique({
      where: { organizationId_name: { organizationId: tenantId, name: oldName } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    if (newName && newName !== oldName) {
      const duplicate = await prisma.tag.findUnique({
        where: { organizationId_name: { organizationId: tenantId, name: newName } },
      });
      if (duplicate) {
        return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 409 });
      }
    }

    const updated = await prisma.tag.update({
      where: { organizationId_name: { organizationId: tenantId, name: oldName } },
      data: {
        ...(newName ? { name: newName } : {}),
        ...(color !== undefined ? { color } : {}),
      },
    });

    if (newName && newName !== oldName) {
      await prisma.$executeRaw`
        UPDATE "Contact"
        SET tags = (
          SELECT jsonb_agg(
            CASE WHEN elem = ${oldName} THEN ${newName} ELSE elem END
          )
          FROM jsonb_array_elements_text(tags) AS elem
        )
        WHERE "organizationId" = ${tenantId}
          AND tags @> ${JSON.stringify([oldName])}::jsonb
      `;
    }

    await invalidateTagsCache(tenantId);

    await logAudit(
      userId, email, 'Tag', updated.name,
      'updated', [
        { field: 'oldName', newValue: oldName },
        { field: 'newName', newValue: newName },
        { field: 'color', newValue: color },
      ], tenantId,
    );

    const contactCount = await prisma.contact.count({
      where: {
        organizationId: tenantId,
        tags: { array_contains: updated.name },
      },
    });

    return NextResponse.json({
      name: updated.name,
      color: updated.color,
      contactCount,
    });
  } catch (error) {
    console.error('Tags update error:', error);
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
});

export const DELETE = withAuthAndPermission('tags:delete')(async (
  request: NextRequest,
  context,
  { params }: { params: { name: string } },
) => {
  try {
    const { tenantId, userId, email } = context;
    const { name } = params;

    const existing = await prisma.tag.findUnique({
      where: { organizationId_name: { organizationId: tenantId, name } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    await prisma.tag.delete({
      where: { organizationId_name: { organizationId: tenantId, name } },
    });

    await prisma.$executeRaw`
      UPDATE "Contact"
      SET tags = (
        SELECT jsonb_agg(elem)
        FROM jsonb_array_elements_text(tags) AS elem
        WHERE elem <> ${name}
      )
      WHERE "organizationId" = ${tenantId}
        AND tags @> ${JSON.stringify([name])}::jsonb
    `;

    await invalidateTagsCache(tenantId);

    await logAudit(
      userId, email, 'Tag', name,
      'deleted', [{ field: 'name', newValue: name }], tenantId,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Tags delete error:', error);
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
});
