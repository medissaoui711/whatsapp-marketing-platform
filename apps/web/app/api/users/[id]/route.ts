import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import bcrypt from 'bcryptjs';
import { updateUserSchema } from '@repo/shared';
import { withAuthAndPermission } from '@repo/auth';
import { logAudit } from '@repo/audit';
import { invalidateUserPermissionsCache } from '@repo/cache';
import type { UserResponse } from '@repo/shared';

export const GET = withAuthAndPermission('users:read')(async (
  request: NextRequest,
  context,
  { params }: { params: { id: string } },
) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: params.id,
        userOrganizations: { some: { organizationId: context.tenantId } },
      },
      include: {
        userOrganizations: {
          where: { organizationId: context.tenantId },
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userOrg = user.userOrganizations[0];
    const isMember = user.organizationId !== context.tenantId;

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
      } : undefined,
      isActive: user.isActive,
      isAvailable: user.isAvailable,
      isSuperAdmin: user.isSuperAdmin,
      isMember,
      organizationId: user.organizationId || '',
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('User get error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
});

export const PUT = withAuthAndPermission('users:update')(async (
  request: NextRequest,
  context,
  { params }: { params: { id: string } },
) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: params.id,
        userOrganizations: { some: { organizationId: context.tenantId } },
      },
      include: {
        userOrganizations: {
          where: { organizationId: context.tenantId },
          include: { role: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isMember = user.organizationId !== context.tenantId;
    const isSelf = context.userId === params.id;

    const body = await request.json();
    const validation = updateUserSchema.safeParse(body);

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

    if (isMember) {
      if (data.roleId === undefined) {
        return NextResponse.json({ error: 'Only role can be updated for organization members' }, { status: 400 });
      }

      const role = await prisma.customRole.findFirst({
        where: { id: data.roleId as string, organizationId: context.tenantId },
      });
      if (!role) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }

      await prisma.userOrganization.updateMany({
        where: { userId: params.id, organizationId: context.tenantId },
        data: { roleId: data.roleId as string },
      });

      await invalidateUserPermissionsCache(params.id);

      return NextResponse.json({
        id: user.id, email: user.email, fullName: user.fullName,
        roleId: data.roleId, isActive: user.isActive,
        isAvailable: user.isAvailable, isSuperAdmin: user.isSuperAdmin,
        isMember: true, organizationId: user.organizationId || '',
        createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString(),
      } as UserResponse);
    }

    const updateData: Record<string, any> = {};

    if (data.email) {
      const existing = await prisma.user.findFirst({
        where: { email: data.email, id: { not: params.id } },
      });
      if (existing) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
      }
      updateData.email = data.email;
    }

    if (data.fullName) updateData.fullName = data.fullName;

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
    }

    let roleChanged = false;
    if (data.roleId !== undefined) {
      const role = await prisma.customRole.findFirst({
        where: { id: data.roleId as string, organizationId: context.tenantId },
      });
      if (!role) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }

      if (isSelf && user.roleId !== data.roleId) {
        const currentRole = await prisma.customRole.findFirst({
          where: { id: user.roleId ?? '' },
        });
        if (currentRole?.name === 'admin') {
          return NextResponse.json({ error: 'Cannot demote yourself' }, { status: 400 });
        }
      }

      roleChanged = true;
      updateData.roleId = data.roleId;
    }

    if (data.isActive !== undefined) {
      if (isSelf && !data.isActive) {
        return NextResponse.json({ error: 'Cannot deactivate yourself' }, { status: 400 });
      }
      updateData.isActive = data.isActive;
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
    });

    if (roleChanged) {
      await prisma.userOrganization.updateMany({
        where: { userId: params.id, organizationId: context.tenantId },
        data: { roleId: data.roleId },
      });
      await invalidateUserPermissionsCache(params.id);
    }

    await logAudit(
      context.userId, context.email, 'User', user.id,
      'updated', [{ field: 'changes', newValue: Object.keys(updateData) }], context.tenantId,
    );

    const response: UserResponse = {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      roleId: updated.roleId || undefined,
      isActive: updated.isActive,
      isAvailable: updated.isAvailable,
      isSuperAdmin: updated.isSuperAdmin,
      isMember: false,
      organizationId: updated.organizationId || '',
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('User update error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
});

export const DELETE = withAuthAndPermission('users:delete')(async (
  request: NextRequest,
  context,
  { params }: { params: { id: string } },
) => {
  try {
    if (context.userId === params.id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        id: params.id,
        userOrganizations: { some: { organizationId: context.tenantId } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isMember = user.organizationId !== context.tenantId;

    if (isMember) {
      await prisma.userOrganization.deleteMany({
        where: { userId: params.id, organizationId: context.tenantId },
      });
      await invalidateUserPermissionsCache(params.id);

      await logAudit(
        context.userId, context.email, 'User', user.id,
        'deleted', [{ field: 'action', newValue: 'remove_member' }], context.tenantId,
      );

      return NextResponse.json({ success: true, message: 'Member removed from organization' });
    }

    const adminRole = await prisma.customRole.findFirst({
      where: { organizationId: context.tenantId, name: 'admin', isSystem: true },
    });

    if (adminRole && user.roleId === adminRole.id) {
      const adminCount = await prisma.userOrganization.count({
        where: { organizationId: context.tenantId, roleId: adminRole.id },
      });
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'Cannot delete the last admin' }, { status: 400 });
      }
    }

    await prisma.userOrganization.deleteMany({ where: { userId: params.id } });
    await prisma.user.delete({ where: { id: params.id } });

    await logAudit(
      context.userId, context.email, 'User', user.id,
      'deleted', [{ field: 'email', newValue: user.email }], context.tenantId,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User delete error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
});
