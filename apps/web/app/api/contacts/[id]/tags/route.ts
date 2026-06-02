import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { updateContactTagsSchema } from '@repo/shared';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';

export const PUT = withAuthAndPermission('contacts:update')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const body = await request.json();
  const validation = updateContactTagsSchema.safeParse(body);

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

  const contact = await prisma.contact.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!contact) {
    return NextResponse.json({ error: 'جهة الاتصال غير موجودة' }, { status: 404 });
  }

  const updated = await prisma.contact.update({
    where: { id: params.id },
    data: { tags: data.tags },
  });

  return NextResponse.json({
    message: 'تم تحديث العلامات',
    tags: (updated.tags as string[]) || [],
  });
});
