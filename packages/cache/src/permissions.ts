import { getCache, CACHE_TTL, CACHE_PREFIX } from './index';
import { prisma } from '@repo/db';

export interface UserPermissionsCache {
  roleId: string;
  roleName: string;
  isSystem: boolean;
  isSuperAdmin: boolean;
  permissions: string[];
}

export async function getUserPermissionsCached(
  userId: string,
  orgId?: string,
): Promise<UserPermissionsCache | null> {
  const cache = getCache();
  const cacheKey = orgId
    ? `${CACHE_PREFIX.USER_PERMISSIONS}${userId}:${orgId}`
    : `${CACHE_PREFIX.USER_PERMISSIONS}${userId}`;

  const cached = await cache.get<UserPermissionsCache>(cacheKey);
  if (cached) return cached;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return null;

  let roleId: string | null = user.roleId;

  if (orgId) {
    const userOrg = await prisma.userOrganization.findFirst({
      where: {
        userId,
        organizationId: orgId,
      },
    });
    if (userOrg?.roleId) {
      roleId = userOrg.roleId;
    }
  }

  if (!roleId) return null;

  const role = await prisma.customRole.findUnique({
    where: { id: roleId },
    include: {
      rolePermissions: {
        include: { permission: true },
      },
    },
  });

  if (!role) return null;

  const permissions: string[] = role.rolePermissions.map(
    (rp) => `${rp.permission.resource}:${rp.permission.action}`,
  );

  const cacheData: UserPermissionsCache = {
    roleId: role.id,
    roleName: role.name,
    isSystem: role.isSystem,
    isSuperAdmin: user.isSuperAdmin,
    permissions,
  };

  await cache.set(cacheKey, cacheData, CACHE_TTL.USER_PERMISSIONS);
  return cacheData;
}

export async function invalidateUserPermissionsCache(userId: string): Promise<void> {
  const cache = getCache();

  const baseKey = `${CACHE_PREFIX.USER_PERMISSIONS}${userId}`;
  await cache.del(baseKey);

  const pattern = `${CACHE_PREFIX.USER_PERMISSIONS}${userId}:*`;
  await cache.deleteByPattern(pattern);
}

export async function invalidateRolePermissionsCache(roleId: string): Promise<void> {
  const cache = getCache();

  const roleKey = `${CACHE_PREFIX.ROLE_PERMISSIONS}${roleId}`;
  await cache.del(roleKey);

  const usersWithRole = await prisma.user.findMany({
    where: { roleId },
    select: { id: true },
  });

  const orgUsers = await prisma.userOrganization.findMany({
    where: { roleId },
    select: { userId: true },
  });

  const userIds = new Set<string>();
  usersWithRole.forEach((u) => userIds.add(u.id));
  orgUsers.forEach((u) => userIds.add(u.userId));

  for (const uid of userIds) {
    await invalidateUserPermissionsCache(uid);
  }
}

export async function invalidateOrgPermissionsCache(orgId: string): Promise<void> {
  const roles = await prisma.customRole.findMany({
    where: { organizationId: orgId },
    select: { id: true },
  });

  for (const role of roles) {
    await invalidateRolePermissionsCache(role.id);
  }
}


