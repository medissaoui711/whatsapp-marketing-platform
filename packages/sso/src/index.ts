import crypto from 'crypto';
import { prisma } from '@repo/db';
import { getCache } from '@repo/cache';

const SSO_STATE_TTL = 300;

interface OAuthConfig {
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

const OAUTH_PROVIDERS: Record<string, Pick<OAuthConfig, 'authorizeUrl' | 'tokenUrl' | 'userInfoUrl' | 'scope'>> = {
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    scope: 'openid email profile',
  },
  microsoft: {
    authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scope: 'User.Read email openid profile',
  },
  github: {
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scope: 'read:user user:email',
  },
  facebook: {
    authorizeUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    userInfoUrl: 'https://graph.facebook.com/v19.0/me?fields=id,name,email,picture',
    scope: 'email public_profile',
  },
};

export function getProviderConfig(provider: string): Pick<OAuthConfig, 'authorizeUrl' | 'tokenUrl' | 'userInfoUrl' | 'scope'> | null {
  return OAUTH_PROVIDERS[provider] || null;
}

export function generateRandomString(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

export async function storeSSOState(
  orgId: string,
  provider: string,
  state: string,
  nonce: string,
): Promise<void> {
  const cache = getCache();
  const key = `sso:state:${orgId}:${provider}:${state}`;
  await cache.set(key, { nonce, orgId, provider, createdAt: Date.now() }, SSO_STATE_TTL);
}

export async function getSSOState(
  orgId: string,
  provider: string,
  state: string,
): Promise<{ nonce: string; orgId: string; provider: string } | null> {
  const cache = getCache();
  const key = `sso:state:${orgId}:${provider}:${state}`;
  const data = await cache.get<{ nonce: string; orgId: string; provider: string }>(key);
  if (data) {
    await cache.del(key);
  }
  return data;
}

export function buildOAuthConfig(
  provider: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  customAuthUrl?: string | null,
  customTokenUrl?: string | null,
  customUserInfoUrl?: string | null,
): OAuthConfig | null {
  const builtIn = getProviderConfig(provider);
  if (!builtIn && !customAuthUrl) return null;

  return {
    authorizeUrl: customAuthUrl || builtIn!.authorizeUrl,
    tokenUrl: customTokenUrl || builtIn!.tokenUrl,
    userInfoUrl: customUserInfoUrl || builtIn!.userInfoUrl,
    scope: builtIn?.scope || 'openid email profile',
    clientId,
    clientSecret,
    redirectUri,
  };
}

export async function exchangeCodeForToken(
  config: OAuthConfig,
  code: string,
): Promise<{ access_token: string; [key: string]: unknown }> {
  const params = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
  });

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (config.tokenUrl.includes('github.com')) {
    headers['Accept'] = 'application/json';
  } else {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers,
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function fetchUserInfo(
  provider: string,
  config: OAuthConfig,
  accessToken: string,
): Promise<{ id: string; email: string; name: string; avatar?: string }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  };

  const response = await fetch(config.userInfoUrl, { headers });

  if (!response.ok) {
    throw new Error(`User info fetch failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  switch (provider) {
    case 'google':
      return {
        id: data.sub,
        email: data.email,
        name: data.name,
        avatar: data.picture,
      };
    case 'microsoft':
      return {
        id: data.id,
        email: data.mail || data.userPrincipalName || '',
        name: data.displayName,
        avatar: undefined,
      };
    case 'github': {
      let email = data.email;
      if (!email) {
        const emailResp = await fetch('https://api.github.com/user/emails', { headers });
        const emails = await emailResp.json();
        const primary = emails.find((e: { primary: boolean }) => e.primary);
        email = primary?.email || emails[0]?.email || '';
      }
      return {
        id: String(data.id),
        email,
        name: data.name || data.login,
        avatar: data.avatar_url,
      };
    }
    case 'facebook':
      return {
        id: data.id,
        email: data.email || '',
        name: data.name,
        avatar: data.picture?.data?.url,
      };
    default: {
      const email = data.email || '';
      const name = data.name || data.displayName || data.login || email;
      return { id: String(data.id || email), email, name, avatar: data.picture || data.avatar_url };
    }
  }
}

export async function getSSOProviders(orgId: string) {
  return prisma.sSOProvider.findMany({
    where: { organizationId: orgId },
    orderBy: { provider: 'asc' },
  });
}

export async function getEnabledSSOProviders(orgId: string): Promise<string[]> {
  const providers = await prisma.sSOProvider.findMany({
    where: { organizationId: orgId, isEnabled: true },
    select: { provider: true },
  });
  return providers.map((p) => p.provider);
}

export async function upsertSSOProvider(
  orgId: string,
  provider: string,
  data: {
    clientId: string;
    clientSecret: string;
    isEnabled?: boolean;
    allowAutoCreate?: boolean;
    defaultRoleName?: string;
    allowedDomains?: string | null;
    authUrl?: string | null;
    tokenUrl?: string | null;
    userInfoUrl?: string | null;
  },
) {
  return prisma.sSOProvider.upsert({
    where: { organizationId_provider: { organizationId: orgId, provider } },
    update: {
      clientId: data.clientId,
      clientSecret: data.clientSecret,
      isEnabled: data.isEnabled ?? false,
      allowAutoCreate: data.allowAutoCreate ?? false,
      defaultRoleName: data.defaultRoleName ?? 'agent',
      allowedDomains: data.allowedDomains ?? null,
      authUrl: data.authUrl ?? null,
      tokenUrl: data.tokenUrl ?? null,
      userInfoUrl: data.userInfoUrl ?? null,
    },
    create: {
      organizationId: orgId,
      provider,
      clientId: data.clientId,
      clientSecret: data.clientSecret,
      isEnabled: data.isEnabled ?? false,
      allowAutoCreate: data.allowAutoCreate ?? false,
      defaultRoleName: data.defaultRoleName ?? 'agent',
      allowedDomains: data.allowedDomains ?? null,
      authUrl: data.authUrl ?? null,
      tokenUrl: data.tokenUrl ?? null,
      userInfoUrl: data.userInfoUrl ?? null,
    },
  });
}

export async function deleteSSOProvider(orgId: string, provider: string) {
  return prisma.sSOProvider.delete({
    where: { organizationId_provider: { organizationId: orgId, provider } },
  });
}


