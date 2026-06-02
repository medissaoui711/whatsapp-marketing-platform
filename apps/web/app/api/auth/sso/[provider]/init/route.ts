import { NextRequest, NextResponse } from 'next/server';
import { getProviderConfig, generateRandomString, storeSSOState } from '@repo/sso';
import { prisma } from '@repo/db';
import { decrypt } from '@repo/auth/src/encryption';

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } },
) {
  try {
    const { provider } = params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const redirectTo = searchParams.get('redirectTo') || '/';

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const providerConfig = getProviderConfig(provider);
    if (!providerConfig) {
      return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
    }

    const ssoProvider = await prisma.sSOProvider.findUnique({
      where: { organizationId_provider: { organizationId: orgId, provider } },
    });

    if (!ssoProvider || !ssoProvider.isEnabled) {
      return NextResponse.json({ error: 'SSO provider not enabled' }, { status: 400 });
    }

    const clientSecret = decrypt(ssoProvider.clientSecret);
    const state = generateRandomString();
    const nonce = generateRandomString();

    await storeSSOState(orgId, provider, state, nonce);

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/sso/${provider}/callback`;

    const urlParams = new URLSearchParams({
      client_id: ssoProvider.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: providerConfig.scope,
      state: JSON.stringify({ state, orgId, redirectTo }),
      nonce,
    });

    const authUrl = ssoProvider.authUrl || providerConfig.authorizeUrl;
    return NextResponse.redirect(`${authUrl}?${urlParams.toString()}`);
  } catch (error) {
    console.error('SSO init error:', error);
    return NextResponse.json({ error: 'Failed to initiate SSO' }, { status: 500 });
  }
}
