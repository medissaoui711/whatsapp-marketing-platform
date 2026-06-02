import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import type { SSOProviderPublic } from '@repo/shared';

export async function GET() {
  try {
    const providers = await prisma.sSOProvider.findMany({
      where: { isEnabled: true },
      select: { provider: true, isEnabled: true },
    });

    const response: SSOProviderPublic[] = providers.map((p) => ({
      provider: p.provider,
      isEnabled: p.isEnabled,
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error('SSO providers error:', error);
    return NextResponse.json({ error: 'Failed to fetch SSO providers' }, { status: 500 });
  }
}


