import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndPermission } from '@repo/auth';
import { logAudit } from '@repo/audit';
import { upsertSSOProvider, deleteSSOProvider } from '@repo/sso';
import { encrypt } from '@repo/auth/src/encryption';
import { updateSSOProviderSchema } from '@repo/shared';
import { getProviderConfig } from '@repo/sso';

function isValidUrl(str: string): boolean {
  try { new URL(str); return true; }
  catch { return false; }
}

export const PUT = withAuthAndPermission('settings:update')(async (
  request: NextRequest,
  context,
  { params }: { params: { provider: string } },
) => {
  try {
    const { tenantId, userId, email } = context;
    const { provider } = params;

    const body = await request.json();
    const validation = updateSSOProviderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'بيانات غير صحيحة',
        details: validation.error.issues.map((e: any) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      }, { status: 400 });
    }

    const data = validation.data;

    const builtInConfig = getProviderConfig(provider);
    if (!builtInConfig) {
      if (data.authUrl && !isValidUrl(data.authUrl)) {
        return NextResponse.json({ error: 'Invalid auth URL for custom provider' }, { status: 400 });
      }
      if (data.tokenUrl && !isValidUrl(data.tokenUrl)) {
        return NextResponse.json({ error: 'Invalid token URL for custom provider' }, { status: 400 });
      }
      if (data.userInfoUrl && !isValidUrl(data.userInfoUrl)) {
        return NextResponse.json({ error: 'Invalid user info URL for custom provider' }, { status: 400 });
      }
    }

    const encryptedSecret = encrypt(data.clientSecret!);

    const ssoProvider = await upsertSSOProvider(tenantId, provider, {
      clientId: data.clientId!,
      clientSecret: encryptedSecret,
      isEnabled: data.isEnabled,
      allowAutoCreate: data.allowAutoCreate,
      defaultRoleName: data.defaultRoleName,
      allowedDomains: data.allowedDomains ?? null,
      authUrl: data.authUrl ?? null,
      tokenUrl: data.tokenUrl ?? null,
      userInfoUrl: data.userInfoUrl ?? null,
    });

    await logAudit(
      userId, email, 'SSOProvider', ssoProvider.id,
      'created', [{ field: 'provider', newValue: provider }, { field: 'changes', newValue: data }], tenantId,
    );

    return NextResponse.json({
      id: ssoProvider.id,
      provider: ssoProvider.provider,
      isEnabled: ssoProvider.isEnabled,
      allowAutoCreate: ssoProvider.allowAutoCreate,
      defaultRoleName: ssoProvider.defaultRoleName,
    });
  } catch (error) {
    console.error('SSO settings upsert error:', error);
    return NextResponse.json({ error: 'Failed to save SSO settings' }, { status: 500 });
  }
});

export const DELETE = withAuthAndPermission('settings:update')(async (
  request: NextRequest,
  context,
  { params }: { params: { provider: string } },
) => {
  try {
    const { tenantId, userId, email } = context;
    const { provider } = params;

    await deleteSSOProvider(tenantId, provider);

    await logAudit(
      userId, email, 'SSOProvider', provider,
      'deleted', [{ field: 'provider', newValue: provider }], tenantId,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SSO settings delete error:', error);
    return NextResponse.json({ error: 'Failed to delete SSO provider' }, { status: 500 });
  }
});
