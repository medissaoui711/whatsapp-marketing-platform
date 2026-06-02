import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission, decrypt } from '@repo/auth';
import type { AuthContext } from '@repo/auth';

export const POST = withAuthAndPermission('accounts:update')(async (
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

  if (!account.webhookVerifyToken) {
    return NextResponse.json({
      error: 'webhookVerifyToken مطلوب للاشتراك في الويب هوك',
    }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const callbackUrl: string | undefined = body.callbackUrl || process.env.WEBHOOK_CALLBACK_URL;

  if (!callbackUrl) {
    return NextResponse.json({
      error: 'callbackUrl مطلوب. أرسله في الطلب أو عيّن WEBHOOK_CALLBACK_URL في المتغيرات البيئية',
    }, { status: 400 });
  }

  let accessToken: string;
  try {
    accessToken = decrypt(account.accessToken);
  } catch {
    return NextResponse.json({ error: 'فشل فك تشفير رمز الوصول' }, { status: 500 });
  }

  let verifyToken: string;
  try {
    verifyToken = decrypt(account.webhookVerifyToken);
  } catch {
    return NextResponse.json({ error: 'فشل فك تشفير رمز التحقق' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${account.apiVersion}/${account.appId || account.phoneId}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          object: 'whatsapp_business_account',
          callback_url: callbackUrl,
          verify_token: verifyToken,
          fields: ['messages', 'message_template_status_update', 'account_update'],
        }),
      }
    );

    if (!res.ok) {
      const errorBody = await res.json().catch(() => null);
      return NextResponse.json({
        error: errorBody?.error?.message || `HTTP ${res.status}: فشل الاشتراك في الويب هوك`,
      }, { status: 500 });
    }

    await prisma.whatsAppAccount.update({
      where: { id: params.id },
      data: { isDefaultIncoming: true },
    });

    return NextResponse.json({
      success: true,
      message: '✅ تم الاشتراك في الويب هوك بنجاح',
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'فشل الاتصال بخوادم Meta',
    }, { status: 500 });
  }
});
