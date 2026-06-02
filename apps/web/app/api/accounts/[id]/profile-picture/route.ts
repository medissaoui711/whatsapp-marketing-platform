import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission, decrypt } from '@repo/auth';
import { WhatsAppClient } from '@repo/integrations';
import type { AuthContext } from '@repo/auth';

const ALLOWED_TYPES = ['image/jpeg', 'image/png'];
const MAX_SIZE = 5 * 1024 * 1024;

export const POST = withAuthAndPermission('accounts:update')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const account = await prisma.whatsAppAccount.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!account) {
    return NextResponse.json({ error: 'الحساب غير موجود' }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'الملف مطلوب' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'نوع الملف غير مسموح. يُسمح فقط بـ JPEG و PNG' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'الملف كبير جداً. الحد الأقصى 5 ميغابايت' }, { status: 400 });
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const client = new WhatsAppClient();
  const accessToken = decrypt(account.accessToken);

  const waAccount = {
    phoneId: account.phoneId,
    businessId: account.businessId,
    appId: account.appId || undefined,
    apiVersion: account.apiVersion,
    accessToken,
  };

  try {
    const handle = await client.uploadProfilePicture(waAccount, fileBuffer, file.type, file.name);

    await client.updateBusinessProfile(waAccount, {
      messagingProduct: 'whatsapp',
      profilePictureHandle: handle,
    });

    await prisma.auditLog.create({
      data: {
        organizationId: context.tenantId,
        resourceType: 'whatsappAccount',
        resourceId: account.id,
        userId: context.userId,
        userName: context.email,
        action: 'updated',
        changes: JSON.stringify([{ field: 'profilePicture', newValue: { fileType: file.type, fileSize: file.size } }]),
      },
    });

    return NextResponse.json({ message: 'تم تحديث صورة الملف الشخصي بنجاح', handle });
  } catch (error) {
    console.error('Failed to upload profile picture:', error);
    return NextResponse.json({ error: 'فشل في رفع صورة الملف الشخصي' }, { status: 500 });
  }
});

export const DELETE = withAuthAndPermission('accounts:update')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const account = await prisma.whatsAppAccount.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!account) {
    return NextResponse.json({ error: 'الحساب غير موجود' }, { status: 404 });
  }

  const client = new WhatsAppClient();
  const accessToken = decrypt(account.accessToken);

  const waAccount = {
    phoneId: account.phoneId,
    businessId: account.businessId,
    apiVersion: account.apiVersion,
    accessToken,
  };

  try {
    await client.updateBusinessProfile(waAccount, {
      messagingProduct: 'whatsapp',
      profilePictureHandle: '',
    });

    await prisma.auditLog.create({
      data: {
        organizationId: context.tenantId,
        resourceType: 'whatsappAccount',
        resourceId: account.id,
        userId: context.userId,
        userName: context.email,
        action: 'updated',
        changes: JSON.stringify([{ field: 'profilePicture', newValue: null }]),
      },
    });

    return NextResponse.json({ message: 'تم إزالة صورة الملف الشخصي بنجاح' });
  } catch (error) {
    console.error('Failed to remove profile picture:', error);
    return NextResponse.json({ error: 'فشل في إزالة صورة الملف الشخصي' }, { status: 500 });
  }
});
