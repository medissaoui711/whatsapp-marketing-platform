import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission, decrypt } from '@repo/auth';
import { businessProfileInputSchema } from '@repo/shared';
import { WhatsAppClient } from '@repo/integrations';
import type { AuthContext } from '@repo/auth';
import type { BusinessProfile } from '@repo/integrations';

export const GET = withAuthAndPermission('accounts:read')(async (
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

  try {
    const profile = await client.getBusinessProfile({
      phoneId: account.phoneId,
      businessId: account.businessId,
      apiVersion: account.apiVersion,
      accessToken,
    }) as BusinessProfile;

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Failed to get business profile:', error);
    return NextResponse.json({ error: 'فشل في جلب ملف الأعمال التجاري' }, { status: 500 });
  }
});

export const PUT = withAuthAndPermission('accounts:update')(async (
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

  const body = await request.json();
  const validation = businessProfileInputSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'بيانات غير صحيحة',
      details: validation.error.issues.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, { status: 400 });
  }

  const client = new WhatsAppClient();
  const accessToken = decrypt(account.accessToken);

  const waAccount = {
    phoneId: account.phoneId,
    businessId: account.businessId,
    apiVersion: account.apiVersion,
    accessToken,
  };

  const input = { ...validation.data, messagingProduct: 'whatsapp' };

  try {
    await client.updateBusinessProfile(waAccount, input);

    await prisma.auditLog.create({
      data: {
        organizationId: context.tenantId,
        resourceType: 'whatsappAccount',
        resourceId: account.id,
        userId: context.userId,
        userName: context.email,
        action: 'updated',
        changes: JSON.stringify([{ field: 'businessProfile', newValue: Object.keys(input) }]),
      },
    });

    try {
      const updatedProfile = await client.getBusinessProfile(waAccount) as BusinessProfile;
      return NextResponse.json(updatedProfile);
    } catch {
      return NextResponse.json({ message: 'تم تحديث ملف الأعمال التجاري بنجاح' });
    }
  } catch (error) {
    console.error('Failed to update business profile:', error);
    return NextResponse.json({ error: 'فشل في تحديث ملف الأعمال التجاري' }, { status: 500 });
  }
});
