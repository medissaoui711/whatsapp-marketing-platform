import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { updateRoleSchema } from '@repo/shared';
import { withAuthAndPermission } from '@repo/auth';
import { invalidateRolePermissionsCache } from '@repo/cache';
import { logAudit, generateChanges } from '@repo/audit';
import type { AuthContext } from '@repo/auth';
import type { RoleResponse } from '@repo/shared';

export const GET = withAuthAndPermission('roles:read')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const role = await prisma.customRole.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
    include: { rolePermissions: { include: { permission: true } } },
  });

  if (!role) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  }

  const userCount = await prisma.user.count({ where: { roleId: role.id } });

  const response: RoleResponse = {
    id: role.id,
    name: role.name,
    description: role.description || '',
    isSystem: role.isSystem,
    isDefault: role.isDefault,
    permissions: role.rolePermissions.map(rp => `${rp.permission.resource}:${rp.permission.action}`),
    userCount,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };

  return NextResponse.json(response);
});

export const PUT = withAuthAndPermission('roles:update')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const role = await prisma.customRole.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
    include: { rolePermissions: { include: { permission: true } } },
  });

  if (!role) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  }

  const body = await request.json();
  const validation = updateRoleSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'Validation failed',
      details: validation.error.issues.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, { status: 400 });
  }

  const data = validation.data;
  const oldPermissions = role.rolePermissions.map(rp => `${rp.permission.resource}:${rp.permission.action}`);

  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.description) updateData.description = data.description;

  if (data.isDefault === true && !role.isDefault) {
    await prisma.$transaction(async (tx) => {
      await tx.customRole.updateMany({
        where: { organizationId: context.tenantId, isDefault: true },
        data: { isDefault: false },
      });
      await tx.customRole.update({
        where: { id: params.id },
        data: { ...updateData, isDefault: true },
      });
    });
  } else if (data.isDefault === false && role.isDefault) {
    await prisma.customRole.update({
      where: { id: params.id },
      data: { ...updateData, isDefault: false },
    });
  } else if (Object.keys(updateData).length) {
    await prisma.customRole.update({
      where: { id: params.id },
      data: updateData,
    });
  }

  if (data.permissions) {
    const permissionKeys = data.permissions.map(p => {
      const [resource, action] = p.split(':');
      return { resource, action };
    });

    const permissions = await prisma.permission.findMany({
      where: { OR: permissionKeys },
    });

    await prisma.customRole.update({
      where: { id: params.id },
      data: { rolePermissions: { set: permissions.map(p => ({ id: p.id })) } },
    });
  }

  await invalidateRolePermissionsCache(params.id);

  await logAudit(context.userId, context.email, 'role', params.id, 'updated',
    generateChanges({ name: role.name, description: role.description, permissions: oldPermissions },
      { name: data.name || role.name, description: data.description || role.description || '', permissions: data.permissions || oldPermissions }),
    context.tenantId);

  const updatedRole = await prisma.customRole.findFirst({
    where: { id: params.id },
    include: { rolePermissions: { include: { permission: true } } },
  });

  const userCount = await prisma.user.count({ where: { roleId: updatedRole?.id } });

  const response: RoleResponse = {
    id: updatedRole!.id,
    name: updatedRole!.name,
    description: updatedRole!.description || '',
    isSystem: updatedRole!.isSystem,
    isDefault: updatedRole!.isDefault,
    permissions: updatedRole!.rolePermissions.map(rp => `${rp.permission.resource}:${rp.permission.action}`),
    userCount,
    createdAt: updatedRole!.createdAt.toISOString(),
    updatedAt: updatedRole!.updatedAt.toISOString(),
  };

  return NextResponse.json(response);
});

export const DELETE = withAuthAndPermission('roles:delete')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const role = await prisma.customRole.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!role) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  }

  if (role.isSystem) {
    return NextResponse.json({ error: 'Cannot delete system roles' }, { status: 400 });
  }

  const userCount = await prisma.user.count({ where: { roleId: role.id } });
  if (userCount > 0) {
    return NextResponse.json({ error: 'Cannot delete role with assigned users' }, { status: 400 });
  }

  await prisma.customRole.delete({ where: { id: params.id } });

  await logAudit(context.userId, context.email, 'role', params.id, 'deleted', [{ field: 'name', oldValue: role.name }], context.tenantId);

  return NextResponse.json({ message: 'Role deleted successfully' });
});
