import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { getTenantSettingsCached, invalidateTenantSettingsCache } from '@repo/cache';

export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get('X-Tenant-ID') || 'demo';

    const tenant = await getTenantSettingsCached(tenantId);
    if (tenant) {
      return NextResponse.json(tenant);
    }

    const tenantData = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, subdomain: true, plan: true, settings: true },
    });

    return NextResponse.json(tenantData);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const tenantId = request.headers.get('X-Tenant-ID') || 'demo';

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { name: body.name, settings: body.settings },
    });

    await invalidateTenantSettingsCache(tenantId);

    return NextResponse.json(tenant);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
