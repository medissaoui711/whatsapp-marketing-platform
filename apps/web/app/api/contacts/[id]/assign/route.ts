import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { assignContactSchema } from '@repo/shared';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import { logAudit } from '@repo/audit';

export const POST = withAuthAndPermission('contacts:assign')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const body = await request.json();
  const validation = assignContactSchema.safeParse(body);

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

  if (data.userId) {
    const user = await prisma.user.findFirst({
      where: { id: data.userId, organizationId: context.tenantId },
    });
    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود في المؤسسة' }, { status: 400 });
    }
  }

  await prisma.contact.update({
    where: { id: params.id },
    data: { assignedUserId: data.userId || null },
  });

  await logAudit(
    context.userId,
    context.email,
    'contact',
    params.id,
    'updated',
    [{ field: 'assignedUserId', oldValue: contact.assignedUserId, newValue: data.userId || null }],
    context.tenantId,
  );

  return NextResponse.json({ message: 'تم إسناد جهة الاتصال', assignedUserId: data.userId || null });
});
