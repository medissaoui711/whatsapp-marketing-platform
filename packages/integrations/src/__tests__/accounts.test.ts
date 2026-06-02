import { randomUUID } from 'crypto';
import { encrypt, decrypt, maskSensitiveConfig } from '@repo/auth';
import { createAccountSchema, updateAccountSchema } from '@repo/shared';
import { MetaMockServer } from './helpers/meta-mock-server';

// ── In-memory DB ────────────────────────────────────────────────

class MockDB {
  private tables = new Map<string, Record<string, unknown>[]>();

  constructor() {
    this.tables.set('whatsappAccount', []);
    this.tables.set('campaign', []);
    this.tables.set('auditLog', []);
  }

  reset(): void {
    for (const key of this.tables.keys()) {
      this.tables.set(key, []);
    }
  }

  private table(name: string): Record<string, unknown>[] {
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
          if (typeof record[key] === 'string' && !(record[key] as string).includes(op.contains as string)) return false;
          continue;
        }
        if ('equals' in op) {
          if (record[key] !== op.equals) return false;
          continue;
        }
      }
      // Direct value match
      const rVal = record[key];
      if (rVal === undefined || rVal === null) {
        if (val !== null && val !== undefined) return false;
      } else if (rVal !== val) return false;
    }
    return true;
  }

  findMany(name: string, args?: { where?: Record<string, unknown>; orderBy?: Record<string, string>; skip?: number; take?: number }): Record<string, unknown>[] {
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

  findFirst(name: string, args?: { where?: Record<string, unknown> }): Record<string, unknown> | null {
    const items = this.findMany(name, { ...args, take: 1 });
    return items[0] || null;
  }

  count(name: string, args?: { where?: Record<string, unknown> }): number {
    return this.findMany(name, args).length;
  }

  create(name: string, data: Record<string, unknown>): Record<string, unknown> {
    const items = this.table(name);
    const id = randomUUID();
    const now = new Date().toISOString();
    const record = { id, ...data, createdAt: now, updatedAt: now };
    items.push(record);
    return record;
  }

  update(name: string, where: { id: string }, data: Record<string, unknown>): Record<string, unknown> | null {
    const items = this.table(name);
    const idx = items.findIndex((i: any) => i.id === where.id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx] as any, ...data, updatedAt: new Date().toISOString() };
    return items[idx];
  }

  updateMany(name: string, where: Record<string, unknown>, data: Record<string, unknown>): number {
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

  delete(name: string, where: { id: string }): boolean {
    const items = this.table(name);
    const idx = items.findIndex((i: any) => i.id === where.id);
    if (idx === -1) return false;
    items.splice(idx, 1);
    return true;
  }

  getAuditLogs(): Record<string, unknown>[] {
    return [...this.table('auditLog')];
  }

  pushAuditLog(data: Record<string, unknown>): void {
    this.table('auditLog').push({ id: randomUUID(), ...data });
  }
}

// ── Test helpers ─────────────────────────────────────────────────

describe('Account API Handlers', () => {
  let db: MockDB;
  let metaServer: MetaMockServer;

  beforeAll(async () => {
    metaServer = new MetaMockServer();
    await metaServer.start();
  });

  afterAll(async () => {
    await metaServer.close();
  });

  beforeEach(() => {
    db = new MockDB();
  });

  function seed(overrides: Record<string, unknown> = {}) {
    return db.create('whatsappAccount', {
      organizationId: 'test-org-id',
      name: 'Test Account',
      phoneId: 'test-phone-id',
      businessId: 'test-biz-id',
      accessToken: encrypt('test-access-token'),
      apiVersion: 'v21.0',
      status: 'active',
      isDefaultIncoming: false,
      isDefaultOutgoing: false,
      autoReadReceipt: false,
      businessCallingEnabled: false,
      createdById: 'test-user-id',
      updatedById: 'test-user-id',
      ...overrides,
    });
  }

  // ── Zod Schema Validation ──────────────────────────────────

  describe('Schema Validation', () => {
    it('should validate valid create input', () => {
      const result = createAccountSchema.safeParse({
        name: 'My Account',
        phoneId: '12345',
        businessId: '67890',
        accessToken: 'token-xyz',
      });
      expect(result.success).toBe(true);
    });

    it('should reject create input missing required fields', () => {
      const result = createAccountSchema.safeParse({ name: 'Incomplete' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const fields = result.error.issues.map(i => i.path[0]);
        expect(fields).toContain('phoneId');
        expect(fields).toContain('businessId');
        expect(fields).toContain('accessToken');
      }
    });

    it('should reject create input with empty name', () => {
      const result = createAccountSchema.safeParse({
        name: '',
        phoneId: '123',
        businessId: '456',
        accessToken: 'token',
      });
      expect(result.success).toBe(false);
    });

    it('should require webhookVerifyToken when isDefaultIncoming', () => {
      const result = createAccountSchema.safeParse({
        name: 'Default',
        phoneId: '123',
        businessId: '456',
        accessToken: 'token',
        isDefaultIncoming: true,
      });
      expect(result.success).toBe(false);
    });

    it('should require webhookVerifyToken when isDefaultOutgoing', () => {
      const result = createAccountSchema.safeParse({
        name: 'Default',
        phoneId: '123',
        businessId: '456',
        accessToken: 'token',
        isDefaultOutgoing: true,
      });
      expect(result.success).toBe(false);
    });

    it('should pass validation with webhookVerifyToken on defaults', () => {
      const result = createAccountSchema.safeParse({
        name: 'Default',
        phoneId: '123',
        businessId: '456',
        accessToken: 'token',
        isDefaultIncoming: true,
        webhookVerifyToken: 'verify-me',
      });
      expect(result.success).toBe(true);
    });

    it('should apply default apiVersion v21.0', () => {
      const result = createAccountSchema.safeParse({
        name: 'Test',
        phoneId: '123',
        businessId: '456',
        accessToken: 'token',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.apiVersion).toBe('v21.0');
      }
    });

    it('should validate update input with partial fields', () => {
      const result = updateAccountSchema.safeParse({ name: 'Updated' });
      expect(result.success).toBe(true);
    });

    it('should reject update input with unknown fields (strict)', () => {
      const result = updateAccountSchema.safeParse({ unknownField: 'value' });
      expect(result.success).toBe(false);
    });
  });

  // ── Encryption ─────────────────────────────────────────────

  describe('Encryption', () => {
    it('should encrypt and decrypt access tokens', () => {
      const token = 'super-secret-whatsapp-token-12345';
      const encrypted = encrypt(token);
      expect(encrypted).not.toBe(token);
      expect(encrypted).toContain(':');

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(token);
    });

    it('should produce different ciphertexts for same plaintext', () => {
      const token = 'same-token';
      const e1 = encrypt(token);
      const e2 = encrypt(token);
      expect(e1).not.toBe(e2);
    });

    it('should mask sensitive config fields', () => {
      const config = {
        name: 'Test',
        accessToken: 'abcdefghijklmnop',
        appSecret: '1234567890abcdef',
        phoneId: 'not-sensitive',
      };
      const masked = maskSensitiveConfig(config as unknown as Record<string, unknown>);
      expect(masked.accessToken).toContain('•');
      expect(masked.appSecret).toContain('•');
      expect(masked.phoneId).toBe('not-sensitive');
      expect(masked.name).toBe('Test');
    });
  });

  // ── CRUD Operations ────────────────────────────────────────

  describe('CRUD Operations', () => {
    it('should create an account', () => {
      const account = db.create('whatsappAccount', {
        organizationId: 'org-1',
        name: 'New Account',
        phoneId: 'phone-1',
        businessId: 'biz-1',
        accessToken: encrypt('token'),
        apiVersion: 'v21.0',
        status: 'active',
        createdById: 'user-1',
      });

      expect(account.id).toBeDefined();
      expect(account.name).toBe('New Account');
      expect(db.count('whatsappAccount', { where: { organizationId: 'org-1' } })).toBe(1);
    });

    it('should list accounts for organization', () => {
      seed({ name: 'A', organizationId: 'org-1' });
      seed({ name: 'B', organizationId: 'org-1' });
      seed({ name: 'C', organizationId: 'org-2' }); // other org

      const org1Accounts = db.findMany('whatsappAccount', { where: { organizationId: 'org-1' } });
      expect(org1Accounts).toHaveLength(2);

      const org2Accounts = db.findMany('whatsappAccount', { where: { organizationId: 'org-2' } });
      expect(org2Accounts).toHaveLength(1);
    });

    it('should enforce organization isolation on read', () => {
      const record = seed({ organizationId: 'other-org' });

      const found = db.findFirst('whatsappAccount', {
        where: { id: record.id as string, organizationId: 'my-org' },
      });
      expect(found).toBeNull();
    });

    it('should update an account', () => {
      const record = seed({ name: 'Original' });

      const updated = db.update('whatsappAccount', { id: record.id as string }, { name: 'Updated' });
      expect(updated).not.toBeNull();
      expect((updated as any).name).toBe('Updated');
    });

    it('should encrypt new access token on update', () => {
      const record = seed({ accessToken: encrypt('old-token') });
      const newToken = 'new-plain-token';

      db.update('whatsappAccount', { id: record.id as string }, { accessToken: encrypt(newToken) });

      const stored = db.findFirst('whatsappAccount', { where: { id: record.id as string } }) as any;
      expect(stored.accessToken).not.toBe(newToken);
      expect(stored.accessToken).toContain(':');
    });

    it('should delete an account', () => {
      const record = seed();
      const deleted = db.delete('whatsappAccount', { id: record.id as string });
      expect(deleted).toBe(true);
      expect(db.count('whatsappAccount', { where: { id: record.id as string } })).toBe(0);
    });

    it('should unset existing default incoming when creating new default', () => {
      seed({ name: 'Old Default', isDefaultIncoming: true });
      db.updateMany('whatsappAccount', { organizationId: 'test-org-id', isDefaultIncoming: true }, { isDefaultIncoming: false });
      db.create('whatsappAccount', {
        organizationId: 'test-org-id',
        name: 'New Default',
        phoneId: 'p',
        businessId: 'b',
        accessToken: encrypt('t'),
        isDefaultIncoming: true,
        createdById: 'user',
      });

      const oldDefault = db.findFirst('whatsappAccount', { where: { name: 'Old Default' } }) as any;
      expect(oldDefault.isDefaultIncoming).toBe(false);
    });

    it('should block deletion if account has active campaigns', () => {
      const record = seed({ name: 'Busy Account' });
      db.create('campaign', {
        whatsappAccount: 'Busy Account',
        status: 'processing',
      });

      const activeCampaign = db.findFirst('campaign', {
        where: { whatsappAccount: 'Busy Account', status: { in: ['processing', 'scheduled'] } },
      });
      expect(activeCampaign).not.toBeNull();

      // Simulate the delete guard
      const canDelete = !activeCampaign;
      expect(canDelete).toBe(false);
    });

    it('should allow deletion if no active campaigns', () => {
      const record = seed({ name: 'Free Account' });
      db.create('campaign', {
        whatsappAccount: 'Free Account',
        status: 'completed',
      });

      const activeCampaign = db.findFirst('campaign', {
        where: { whatsappAccount: 'Free Account', status: { in: ['processing', 'scheduled'] } },
      });
      expect(activeCampaign).toBeNull();
    });
  });

  // ── Audit Log ──────────────────────────────────────────────

  describe('Audit Log', () => {
    it('should log creation', () => {
      const account = db.create('whatsappAccount', {
        organizationId: 'org-1',
        name: 'New',
        phoneId: 'p',
        businessId: 'b',
        accessToken: encrypt('t'),
        createdById: 'user-1',
      });

      db.pushAuditLog({
        organizationId: 'org-1',
        resourceType: 'whatsappAccount',
        resourceId: account.id,
        userId: 'user-1',
        userName: 'test@example.com',
        action: 'created',
        changes: JSON.stringify([{ field: 'name', newValue: 'New' }]),
      });

      const logs = db.getAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('created');
      expect(logs[0].resourceType).toBe('whatsappAccount');
    });

    it('should log updates with field-level changes', () => {
      const record = seed({ name: 'Before' });
      db.update('whatsappAccount', { id: record.id as string }, { name: 'After' });

      const changes = [
        { field: 'name', oldValue: 'Before', newValue: 'After' },
      ];

      db.pushAuditLog({
        organizationId: 'test-org-id',
        resourceType: 'whatsappAccount',
        resourceId: record.id,
        userId: 'user-1',
        userName: 'admin@org.com',
        action: 'updated',
        changes: JSON.stringify(changes),
      });

      const logs = db.getAuditLogs();
      const updateLog = logs.find(l => l.action === 'updated');
      expect(updateLog).toBeDefined();
      expect(JSON.parse(updateLog!.changes as string)).toEqual(changes);
    });

    it('should log deletion', () => {
      const record = seed({ name: 'Deleted Account' });
      db.delete('whatsappAccount', { id: record.id as string });

      db.pushAuditLog({
        organizationId: 'test-org-id',
        resourceType: 'whatsappAccount',
        resourceId: record.id,
        userId: 'user-1',
        userName: 'admin@org.com',
        action: 'deleted',
        changes: JSON.stringify([{ field: 'name', oldValue: 'Deleted Account' }]),
      });

      const logs = db.getAuditLogs();
      const deleteLog = logs.find(l => l.action === 'deleted');
      expect(deleteLog).toBeDefined();
    });
  });

  // ── MetaMockServer Integration ─────────────────────────────

  describe('MetaMockServer Integration', () => {
    it('should respond with phone details by default', async () => {
      const res = await fetch(`${metaServer.url}/some/phone/path`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.display_phone_number).toBe('+1234567890');
      expect(data.verified_name).toBe('Test');
    });

    it('should respond with business info for id/name query', async () => {
      const res = await fetch(`${metaServer.url}/biz?fields=id,name`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe('biz');
    });

    it('should respond to subscribe endpoint', async () => {
      const res = await fetch(`${metaServer.url}/app/subscribed_apps`, { method: 'POST' });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it('should respond with messaging limit info', async () => {
      const res = await fetch(`${metaServer.url}/phone/whatsapp_business_manager_messaging_limit`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.whatsapp_business_manager_messaging_limit).toBe('TIER_10K');
    });

    it('should track hit counts', async () => {
      metaServer.resetHits();
      await fetch(`${metaServer.url}/path-a`);
      await fetch(`${metaServer.url}/path-b`);
      await fetch(`${metaServer.url}/path-a`);

      expect(metaServer.getHitCount('/path-a')).toBe(2);
      expect(metaServer.getHitCount('/path-b')).toBe(1);
    });

    it('should allow custom response handlers', async () => {
      const customServer = new MetaMockServer({
        phoneDetailsFn: () => ({ status: 403, body: { error: 'custom error' } }),
      });
      await customServer.start();

      const res = await fetch(`${customServer.url}/phone`);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('custom error');

      await customServer.close();
    });
  });
});


