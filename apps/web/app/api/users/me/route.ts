import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuth } from '@repo/auth';
import { userSettingsSchema } from '@repo/shared';
import { getUserProfileCached, setUserProfileCache, invalidateUserProfileCache } from '@repo/cache';
import type { UserResponse } from '@repo/shared';

export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const { userId, tenantId } = context;

    const cached = await getUserProfileCached(userId, tenantId);
    if (cached) {
      return NextResponse.json(cached);
    }

    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        organizationId: true,
        isActive: true,
        isAvailable: true,
        isSuperAdmin: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
        userOrganizations: {
          where: { organizationId: tenantId },
          select: {
            roleId: true,
            role: {
              select: {
                id: true,
                name: true,
                description: true,
                isSystem: true,
                rolePermissions: {
                  select: {
                    permission: {
                      select: { id: true, resource: true, action: true, description: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userOrg = user.userOrganizations[0];
    const isMember = user.organizationId !== tenantId;

    const response: UserResponse = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roleId: userOrg?.roleId || undefined,
      role: userOrg?.role ? {
        id: userOrg.role.id,
        name: userOrg.role.name,
        description: userOrg.role.description || '',
        isSystem: userOrg.role.isSystem,
        permissions: userOrg.role.rolePermissions.map(rp => ({
          id: rp.permission.id,
          resource: rp.permission.resource,
          action: rp.permission.action,
          description: rp.permission.description,
        })),
      } : undefined,
      isActive: user.isActive,
      isAvailable: user.isAvailable,
      isSuperAdmin: user.isSuperAdmin,
      isMember,
      organizationId: user.organizationId || '',
      settings: user.settings as Record<string, any>,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    await setUserProfileCache(userId, tenantId, response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Current user get error:', error);
    return NextResponse.json({ error: 'Failed to fetch current user' }, { status: 500 });
  }
});

export const PUT = withAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.json();
    const validation = userSettingsSchema.safeParse(body);

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
    const user = await prisma.user.findUnique({
      where: { id: context.userId },
      select: { settings: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const settings = (user.settings as Record<string, any>) || {};

    if (data.emailNotifications !== undefined) settings.emailNotifications = data.emailNotifications;
    if (data.newMessageAlerts !== undefined) settings.newMessageAlerts = data.newMessageAlerts;
    if (data.campaignUpdates !== undefined) settings.campaignUpdates = data.campaignUpdates;

    await prisma.user.update({
      where: { id: context.userId },
      data: { settings },
    });

    await invalidateUserProfileCache(context.userId, context.tenantId);

    return NextResponse.json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    console.error('Current user update error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
});
