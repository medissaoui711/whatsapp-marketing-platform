import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission, decrypt } from '@repo/auth';
import type { AuthContext } from '@repo/auth';

export const POST = withAuthAndPermission('accounts:read')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  const account = await prisma.whatsAppAccount.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!account) {
    return NextResponse.json({ error: 'الحساب غير موجود' }, { status: 404 });
  }

  let accessToken: string;
  try {
    accessToken = decrypt(account.accessToken);
  } catch {
    return NextResponse.json({ success: false, message: 'فشل فك تشفير رمز الوصول' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${account.apiVersion}/${account.phoneId}/messages?access_token=${accessToken}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } }
    );

    if (!res.ok) {
      const errorBody = await res.json().catch(() => null);
      return NextResponse.json({
        success: false,
        message: errorBody?.error?.message || `HTTP ${res.status}: فشل الاتصال بـ Meta API`,
      });
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      message: '✅ الاتصال ناجح. الحساب يعمل بشكل صحيح.',
      data,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'فشل الاتصال بخوادم Meta',
    });
  }
});
