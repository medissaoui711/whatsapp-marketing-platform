import { NextResponse } from 'next/server';
import { withAuthAndPermission } from '@repo/auth';
import { logAudit } from '@repo/audit';
import { getSSOProviders } from '@repo/sso';
import { decrypt } from '@repo/auth/encryption';
import type { SSOProviderResponse } from '@repo/shared';

export const GET = withAuthAndPermission('settings:read')(async (request, context) => {
  try {
    const { tenantId, userId, email } = context;
    const providers = await getSSOProviders(tenantId);

    const response: SSOProviderResponse[] = providers.map((p) => ({
      id: p.id,
      organizationId: p.organizationId,
      provider: p.provider,
      clientId: p.clientId,
      clientSecret: (() => {
        try { return decrypt(p.clientSecret); } catch { return p.clientSecret; }
      })(),
      isEnabled: p.isEnabled,
      allowAutoCreate: p.allowAutoCreate,
      defaultRoleName: p.defaultRoleName,
      allowedDomains: p.allowedDomains,
      authUrl: p.authUrl,
      tokenUrl: p.tokenUrl,
      userInfoUrl: p.userInfoUrl,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error('SSO settings list error:', error);
    return NextResponse.json({ error: 'Failed to fetch SSO settings' }, { status: 500 });
  }
});


