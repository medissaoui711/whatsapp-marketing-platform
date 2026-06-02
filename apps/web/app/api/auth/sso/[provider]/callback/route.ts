import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@repo/db';
import { signAccessToken, signRefreshToken } from '@repo/auth';
import { setAuthCookies } from '@repo/auth/src/cookies';
import { decrypt } from '@repo/auth/src/encryption';
import { buildOAuthConfig, exchangeCodeForToken, fetchUserInfo, getSSOState } from '@repo/sso';
import { randomUUID } from 'crypto';

async function finishLogin(user: any, orgId: string, redirectTo: string) {
  const jti = randomUUID();
  const accessTokenJwt = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role?.name || 'viewer',
    tenantId: orgId,
    isSuperAdmin: user.isSuperAdmin,
    roleId: user.roleId || undefined,
    organizationId: orgId,
  });

  const refreshToken = signRefreshToken({
    userId: user.id,
    email: user.email,
    role: user.role?.name || 'viewer',
    tenantId: orgId,
    isSuperAdmin: user.isSuperAdmin,
    roleId: user.roleId || undefined,
    organizationId: orgId,
    jti,
  });

  const expiryDays = parseInt(process.env.JWT_REFRESH_EXPIRY_DAYS || '7');
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      jti,
      userId: user.id,
      tenantId: orgId,
      expiresAt,
    },
  });

  const response = NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}${redirectTo}`,
  );

  setAuthCookies(response, accessTokenJwt, refreshToken, {
    secure: process.env.NODE_ENV === 'production',
    domain: process.env.COOKIE_DOMAIN,
    basePath: process.env.NEXT_PUBLIC_BASE_PATH,
  });

  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } },
) {
  try {
    const { provider } = params;
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/sso/callback?error=${errorParam}`,
      );
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/sso/callback?error=missing_params`,
      );
    }

    let parsedState: { state: string; orgId: string; redirectTo: string };
    try {
      parsedState = JSON.parse(stateParam);
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/sso/callback?error=invalid_state`,
      );
    }

    const { state, orgId, redirectTo } = parsedState;

    const savedState = await getSSOState(orgId, provider, state);
    if (!savedState) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/sso/callback?error=state_expired`,
      );
    }

    const ssoProvider = await prisma.sSOProvider.findUnique({
      where: { organizationId_provider: { organizationId: orgId, provider } },
    });

    if (!ssoProvider) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/sso/callback?error=provider_not_found`,
      );
    }

    const clientSecret = decrypt(ssoProvider.clientSecret);
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/sso/${provider}/callback`;

    const config = buildOAuthConfig(
      provider,
      ssoProvider.clientId,
      clientSecret,
      redirectUri,
      ssoProvider.authUrl,
      ssoProvider.tokenUrl,
      ssoProvider.userInfoUrl,
    );

    if (!config) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/sso/callback?error=invalid_config`,
      );
    }

    const tokenData = await exchangeCodeForToken(config, code);
    const accessTokenStr = tokenData.access_token as string;

    if (!accessTokenStr) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/sso/callback?error=no_access_token`,
      );
    }

    const userInfo = await fetchUserInfo(provider, config, accessTokenStr);

    if (!userInfo.email) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/sso/callback?error=no_email`,
      );
    }

    if (ssoProvider.allowedDomains) {
      const domains = ssoProvider.allowedDomains.split(',').map((d: string) => d.trim());
      const emailDomain = userInfo.email.split('@')[1];
      if (!domains.includes(emailDomain)) {
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/auth/sso/callback?error=domain_not_allowed`,
        );
      }
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: userInfo.email },
      include: {
        role: { include: { rolePermissions: { include: { permission: true } } } },
        organization: true,
      },
    });

    if (existingUser) {
      if (!existingUser.isActive) {
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/auth/sso/callback?error=account_disabled`,
        );
      }
      return finishLogin(existingUser, orgId, redirectTo);
    }

    if (!ssoProvider.allowAutoCreate) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/sso/callback?error=user_not_found`,
      );
    }

    let defaultRole = await prisma.customRole.findFirst({
      where: { organizationId: orgId, name: ssoProvider.defaultRoleName },
    });

    if (!defaultRole) {
      defaultRole = await prisma.customRole.findFirst({
        where: { organizationId: orgId, isDefault: true },
      });
    }

    if (!defaultRole) {
      defaultRole = await prisma.customRole.findFirst({
        where: { organizationId: orgId, name: 'agent' },
      });
    }

    const dummyPassword = randomUUID() + randomUUID();
    const passwordHash = await bcrypt.hash(dummyPassword, 12);

    const newUser = await prisma.user.create({
      data: {
        email: userInfo.email,
        fullName: userInfo.name,
        passwordHash,
        organizationId: orgId,
        roleId: defaultRole?.id,
        isActive: true,
      },
      include: {
        role: { include: { rolePermissions: { include: { permission: true } } } },
        organization: true,
      },
    }) as any;

    return finishLogin(newUser, orgId, redirectTo);
  } catch (error) {
    console.error('SSO callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/sso/callback?error=internal_error`,
    );
  }
}
