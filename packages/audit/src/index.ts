import { prisma } from '@repo/db';

export type AuditAction = 'created' | 'updated' | 'deleted';

export interface AuditChange {
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
}

const SKIP_FIELDS = new Set([
  'id', 'createdAt', 'updatedAt', 'deletedAt', 'tenantId', 'organizationId',
  'createdById', 'updatedById',
  'password', 'passwordHash', 'accessToken', 'appSecret', 'clientSecret', 'secret', 'keyHash',
]);

export async function logAudit(
  userId: string,
  userName: string,
  resourceType: string,
  resourceId: string,
  action: AuditAction,
  changes: AuditChange[],
  organizationId: string,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      userName,
      resourceType,
      resourceId,
      action,
      changes: JSON.stringify(changes),
    },
  });
}

export function generateChanges<T extends object>(
  oldData: T | null,
  newData: T,
  excludeFields: string[] = ['id', 'createdAt', 'updatedAt', 'deletedAt'],
): AuditChange[] {
  if (!oldData) {
    return Object.entries(newData)
      .filter(([key]) => !excludeFields.includes(key))
      .map(([field, value]) => ({
        field,
        oldValue: null,
        newValue: value,
      }));
  }

  const changes: AuditChange[] = [];

  for (const key of Object.keys(newData) as (keyof T)[]) {
    const field = String(key);
    if (excludeFields.includes(field)) continue;

    const oldValue = oldData[key];
    const newValue = newData[key];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field,
        oldValue: oldValue ?? null,
        newValue: newValue ?? null,
      });
    }
  }

  return changes;
}

function toMap(obj: unknown): Record<string, unknown> {
  if (!obj) return {};
  try {
    return JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function jsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function computeChanges(
  oldData: unknown,
  newData: unknown,
  extraSkipFields?: Set<string>,
): AuditChange[] {
  const changes: AuditChange[] = [];
  const skip = new Set([...SKIP_FIELDS, ...(extraSkipFields ?? [])]);

  if (oldData && !newData) {
    const oldMap = toMap(oldData);
    for (const [key, value] of Object.entries(oldMap)) {
      if (skip.has(key)) continue;
      changes.push({ field: key, oldValue: value, newValue: null });
    }
    return changes;
  }

  if (!oldData && newData) {
    const newMap = toMap(newData);
    for (const [key, value] of Object.entries(newMap)) {
      if (skip.has(key)) continue;
      changes.push({ field: key, oldValue: null, newValue: value });
    }
    return changes;
  }

  const oldMap = toMap(oldData);
  const newMap = toMap(newData);
  const allKeys = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);

  for (const key of allKeys) {
    if (skip.has(key)) continue;
    if (!jsonEqual(oldMap[key], newMap[key])) {
      changes.push({
        field: key,
        oldValue: oldMap[key] ?? null,
        newValue: newMap[key] ?? null,
      });
    }
  }

  return changes;
}

export async function getUserName(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true, email: true },
  });
  return user?.fullName || user?.email || 'Unknown';
}

export function formatFieldLabel(field: string): string {
  if (!field) return '';
  return field
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}


