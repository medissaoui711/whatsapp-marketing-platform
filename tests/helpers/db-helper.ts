import { randomUUID } from 'crypto';

export type TableName = string;

export class MockDB {
  private tables = new Map<TableName, Record<string, unknown>[]>();

  constructor() {
    this.tables.set('organization', []);
    this.tables.set('user', []);
    this.tables.set('contact', []);
    this.tables.set('message', []);
    this.tables.set('campaign', []);
    this.tables.set('tag', []);
    this.tables.set('webhook', []);
    this.tables.set('integration', []);
    this.tables.set('auditLog', []);
    this.tables.set('whatsappAccount', []);
    this.tables.set('chatbotSettings', []);
    this.tables.set('widget', []);
    this.tables.set('customRole', []);
    this.tables.set('permission', []);
    this.tables.set('rolePermission', []);
    this.tables.set('userOrganization', []);
  }

  reset(): void {
    for (const key of this.tables.keys()) {
      this.tables.set(key, []);
    }
  }

  private table(name: TableName): Record<string, unknown>[] {
    return this.tables.get(name) || [];
  }

  private match(record: Record<string, unknown>, where: Record<string, unknown>): boolean {
    for (const [key, val] of Object.entries(where)) {
      if (key === 'AND' && Array.isArray(val)) {
        for (const condition of val) {
          if (!this.match(record, condition as Record<string, unknown>)) return false;
        }
        continue;
      }
      if (key === 'OR' && Array.isArray(val)) {
        let anyMatch = false;
        for (const condition of val) {
          if (this.match(record, condition as Record<string, unknown>)) { anyMatch = true; break; }
        }
        if (!anyMatch) return false;
        continue;
      }
      if (key === 'NOT') {
        if (this.match(record, val as Record<string, unknown>)) return false;
        continue;
      }
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        const op = val as Record<string, unknown>;
        if ('in' in op) {
          const arr = op.in as unknown[];
          if (!arr.includes(record[key])) return false;
          continue;
        }
        if ('not' in op) {
          if (record[key] === op.not) return false;
          continue;
        }
        if ('contains' in op) {
          const rVal = record[key];
          if (Array.isArray(rVal)) {
            if (!rVal.some((item: unknown) =>
              String(item).toLowerCase().includes(String(op.contains).toLowerCase()),
            )) return false;
          } else if (typeof rVal === 'string') {
            if (!rVal.toLowerCase().includes(String(op.contains).toLowerCase())) return false;
          } else {
            return false;
          }
          continue;
        }
        if ('gte' in op) {
          const rVal = record[key] as number;
          const tVal = op.gte as number;
          if (rVal < tVal) return false;
          continue;
        }
        if ('lte' in op) {
          const rVal = record[key] as number;
          const tVal = op.lte as number;
          if (rVal > tVal) return false;
          continue;
        }
      }
      const rVal = record[key];
      if (rVal === undefined || rVal === null) {
        if (val !== null && val !== undefined) return false;
      } else if (rVal !== val) return false;
    }
    return true;
  }

  create(name: TableName, data: Record<string, unknown>): Record<string, unknown> {
    const items = this.table(name);
    const id = data.id as string || randomUUID();
    const now = new Date().toISOString();
    const record = { id, createdAt: now, updatedAt: now, ...data };
    items.push(record);
    return record;
  }

  findMany(name: TableName, args?: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, string>;
    skip?: number;
    take?: number;
  }): Record<string, unknown>[] {
    let items = [...this.table(name)];
    if (args?.where) {
      items = items.filter(item => this.match(item, args.where!));
    }
    if (args?.orderBy) {
      for (const [field, dir] of Object.entries(args.orderBy)) {
        items.sort((a: any, b: any) => {
          const cmp = a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0;
          return dir === 'desc' ? -cmp : cmp;
        });
      }
    }
    if (args?.skip) items = items.slice(args.skip);
    if (args?.take) items = items.slice(0, args.take);
    return items;
  }

  findFirst(name: TableName, args?: { where?: Record<string, unknown> }): Record<string, unknown> | null {
    const items = this.findMany(name, { ...args, take: 1 });
    return items[0] || null;
  }

  count(name: TableName, args?: { where?: Record<string, unknown> }): number {
    return this.findMany(name, args).length;
  }

  update(name: TableName, where: { id: string }, data: Record<string, unknown>): Record<string, unknown> | null {
    const items = this.table(name);
    const idx = items.findIndex((i: any) => i.id === where.id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx] as any, ...data, updatedAt: new Date().toISOString() };
    return items[idx];
  }

  updateMany(name: TableName, where: Record<string, unknown>, data: Record<string, unknown>): number {
    const items = this.table(name);
    let count = 0;
    for (const item of items) {
      if (this.match(item, where)) {
        Object.assign(item, data);
        count++;
      }
    }
    return count;
  }

  delete(name: TableName, where: { id: string }): boolean {
    const items = this.table(name);
    const idx = items.findIndex((i: any) => i.id === where.id);
    if (idx === -1) return false;
    items.splice(idx, 1);
    return true;
  }

  createOrg(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return this.create('organization', {
      name: 'Test Org',
      slug: 'test-org',
      settings: {},
      ...overrides,
    });
  }

  createUser(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return this.create('user', {
      email: 'user@example.com',
      fullName: 'Test User',
      passwordHash: '$2b$10$mock_hash',
      organizationId: 'test-org-id',
      isActive: true,
      isSuperAdmin: false,
      settings: {},
      ...overrides,
    });
  }

  createContact(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return this.create('contact', {
      phoneNumber: '+1234567890',
      profileName: 'Test Contact',
      organizationId: 'test-org-id',
      tags: [],
      isRead: true,
      ...overrides,
    });
  }
}

export function createMockDB(): MockDB {
  return new MockDB();
}
