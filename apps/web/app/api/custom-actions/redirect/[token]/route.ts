import { NextRequest, NextResponse } from 'next/server';

const redirectTokens = new Map<string, { url: string; expiresAt: Date }>();

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  const entry = redirectTokens.get(params.token);

  if (!entry) {
    return NextResponse.json({ error: 'رمز إعادة التوجيه غير صالح أو منتهي الصلاحية' }, { status: 404 });
  }

  if (entry.expiresAt < new Date()) {
    redirectTokens.delete(params.token);
    return NextResponse.json({ error: 'انتهت صلاحية رمز إعادة التوجيه' }, { status: 410 });
  }

  redirectTokens.delete(params.token);

  return NextResponse.redirect(entry.url, 302);
}
