import { NextRequest, NextResponse } from 'next/server';
import { withAuth, generateTOTPSecret, generateTOTPQRCode, enable2FA, verifyTOTPToken, is2FAEnabled } from '@repo/auth';
import type { AuthContext } from '@repo/auth';

export const GET = withAuth(async (
  request: NextRequest,
  context: AuthContext
) => {
  const enabled = await is2FAEnabled(context.userId);

  if (enabled) {
    return NextResponse.json({ enabled: true });
  }

  const secret = generateTOTPSecret(context.email);
  const qrCode = await generateTOTPQRCode(secret.otpauth_url);

  return NextResponse.json({
    enabled: false,
    secret: secret.base32,
    qrCode,
    otpauthUrl: secret.otpauth_url,
  });
});

export const POST = withAuth(async (
  request: NextRequest,
  context: AuthContext
) => {
  const body = await request.json();
  const { token, secret } = body;

  if (!token || !secret) {
    return NextResponse.json({ error: 'رمز المصادقة والسر مطلوبان' }, { status: 400 });
  }

  const isValid = verifyTOTPToken(secret, token);
  if (!isValid) {
    return NextResponse.json({ error: 'رمز المصادقة غير صحيح' }, { status: 400 });
  }

  await enable2FA(context.userId, secret);

  return NextResponse.json({ success: true, message: 'تم تفعيل المصادقة الثنائية بنجاح' });
});

export const DELETE = withAuth(async (
  request: NextRequest,
  context: AuthContext
) => {
  const { disable2FA } = await import('@repo/auth');
  await disable2FA(context.userId);
  return NextResponse.json({ success: true, message: 'تم إلغاء المصادقة الثنائية' });
});


