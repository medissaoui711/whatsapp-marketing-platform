import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { roleSchema } from '@repo/shared';
import { withAuthAndPermission } from '@repo/auth';
import { invalidateRolePermissionsCache } from '@repo/cache';
import { logAudit } from '@repo/audit';
import type { AuthContext } from '@repo/auth';
import type { RoleResponse } from '@repo/shared';

export const GET = withAuthAndPermission('roles:read')(async (
  request: NextRequest,
  context: AuthContext,
) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const search = searchParams.get('search') || '';

  const where: any = { organizationId: context.tenantId };
  if (search) {
    where.name = { contains: search };
  }

  const [roles, total] = await Promise.all([
    prisma.customRole.findMany({
      where,
      include: { rolePermissions: { include: { permission: true } } },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customRole.count({ where }),
  ]);

  const userCounts = await prisma.user.groupBy({
    by: ['roleId'],
    where: { roleId: { in: roles.map(r => r.id) } },
    _count: { id: true },
  });
  const userCountMap = new Map(userCounts.map(uc => [uc.roleId, uc._count.id]));

  const response: RoleResponse[] = roles.map(role => ({
    id: role.id,
    name: role.name,
    description: role.description || '',
    isSystem: role.isSystem,
    isDefault: role.isDefault,
    permissions: role.rolePermissions.map(rp => `${rp.permission.resource}:${rp.permission.action}`),
    userCount: userCountMap.get(role.id) || 0,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  }));

  return NextResponse.json({ roles: response, total, page, limit });
});

export const POST = withAuthAndPermission('roles:create')(async (
  request: NextRequest,
  context: AuthContext,
) => {
  const body = await request.json();
  const validation = roleSchema.safeParse(body);

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

  const existing = await prisma.customRole.findFirst({
    where: { organizationId: context.tenantId, name: data.name },
  });

  if (existing) {
    return NextResponse.json({ error: 'Role with this name already exists' }, { status: 409 });
  }

  let permissions: Array<{ id: string }> = [];
  if (data.permissions.length) {
    const permissionKeys = data.permissions.map(p => {
      const [resource, action] = p.split(':');
      return { resource, action };
    });

    const found = await prisma.permission.findMany({
      where: { OR: permissionKeys },
    });
    permissions = found.map(p => ({ id: p.id }));
  }

  if (data.isDefault) {
    await prisma.$transaction(async (tx) => {
      await tx.customRole.updateMany({
        where: { organizationId: context.tenantId, isDefault: true },
        data: { isDefault: false },
      });
      await tx.customRole.create({
        data: {
          organizationId: context.tenantId,
          name: data.name,
          description: data.description,
          isDefault: true,
          rolePermissions: { connect: permissions },
        },
      });
    });
  } else {
    await prisma.customRole.create({
      data: {
        organizationId: context.tenantId,
        name: data.name,
        description: data.description,
        isDefault: data.isDefault,
        rolePermissions: { connect: permissions },
      },
    });
  }

  const role = await prisma.customRole.findFirst({
    where: { organizationId: context.tenantId, name: data.name },
    include: { rolePermissions: { include: { permission: true } } },
  });

  if (!role) {
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }

  await logAudit(context.userId, context.email, 'role', role.id, 'created', [{ field: 'name', newValue: role.name }], context.tenantId);

  const response: RoleResponse = {
    id: role.id,
    name: role.name,
    description: role.description || '',
    isSystem: role.isSystem,
    isDefault: role.isDefault,
    permissions: role.rolePermissions.map(rp => `${rp.permission.resource}:${rp.permission.action}`),
    userCount: 0,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };

  await invalidateRolePermissionsCache(role.id);

  return NextResponse.json(response, { status: 201 });
});


