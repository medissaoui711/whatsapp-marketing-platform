import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import bcrypt from 'bcryptjs';
import { userSchema } from '@repo/shared';
import { withAuthAndPermission } from '@repo/auth';
import { logAudit } from '@repo/audit';
import type { UserResponse } from '@repo/shared';

export const GET = withAuthAndPermission('users:read')(async (request: NextRequest, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = searchParams.get('search') || '';
    const roleId = searchParams.get('role_id');
    const skip = (page - 1) * limit;

    const where: any = {
      userOrganizations: {
        some: { organizationId: context.tenantId },
      },
    };

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (roleId) {
      where.userOrganizations = {
        some: { organizationId: context.tenantId, roleId },
      };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const data: UserResponse[] = users.map(user => {
      const userOrg = user.userOrganizations[0];
      const isMember = user.organizationId !== context.tenantId;

      return {
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
    });

    return NextResponse.json({ data, total, page, limit });
  } catch (error) {
    console.error('Users list error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
});

export const POST = withAuthAndPermission('users:create')(async (request: NextRequest, context) => {
  try {
    const body = await request.json();
    const validation = userSchema.safeParse(body);

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

    if (!data.password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    let roleId = data.roleId;
    if (!roleId) {
      const defaultRole = await prisma.customRole.findFirst({
        where: { organizationId: context.tenantId, isDefault: true },
      });
      if (defaultRole) roleId = defaultRole.id;
    }

    if (roleId) {
      const role = await prisma.customRole.findFirst({
        where: { id: roleId, organizationId: context.tenantId },
      });
      if (!role) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        organizationId: context.tenantId,
        roleId,
        isActive: data.isActive ?? true,
      },
    });

    await prisma.userOrganization.create({
      data: {
        userId: user.id,
        organizationId: context.tenantId,
        roleId,
        isDefault: true,
      },
    });

    await logAudit(
      context.userId, context.email, 'User', user.id,
      'created', [{ field: 'email', newValue: user.email }], context.tenantId,
    );

    const response: UserResponse = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roleId: user.roleId || undefined,
      isActive: user.isActive,
      isAvailable: user.isAvailable,
      isSuperAdmin: user.isSuperAdmin,
      isMember: false,
      organizationId: user.organizationId || '',
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Users create error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
});


