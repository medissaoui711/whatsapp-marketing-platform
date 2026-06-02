import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { MockDB, createMockDB } from '../../helpers/db-helper';
import { getTestAuthHeaders } from '../../helpers/auth-helper';
import { startMockServer, stopMockServer, mockServer } from '../../setup/msw-handlers';

describe('Contacts API Integration', () => {
  let db: MockDB;

  beforeEach(async () => {
    db = createMockDB();
    db.reset();
    await startMockServer();
  });

  afterAll(async () => {
    await stopMockServer();
  });

  describe('MockServer basics', () => {
    it('should start and respond to requests', async () => {
      const res = await fetch(`${mockServer.url}/v21.0/phone-id/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: '5511999999999',
          type: 'text',
          text: { body: 'Hello' },
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.messages[0].id).toMatch(/^wamid\.mock\./);
    });

    it('should track hit counts', async () => {
      await fetch(`${mockServer.url}/v21.0/test/messages`, { method: 'POST' });
      await fetch(`${mockServer.url}/v21.0/test/messages`, { method: 'POST' });

      expect(mockServer.getHitCount('POST', '/v21.0/test/messages')).toBe(2);
    });
  });

  describe('Auth headers', () => {
    it('should generate valid auth headers', () => {
      const headers = getTestAuthHeaders({ userId: 'user-1', tenantId: 'org-1' });

      expect(headers['Authorization']).toMatch(/^Bearer /);
      expect(headers['X-Tenant-ID']).toBe('org-1');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should generate different tokens for different users', () => {
      const h1 = getTestAuthHeaders({ userId: 'user-a' });
      const h2 = getTestAuthHeaders({ userId: 'user-b' });

      expect(h1['Authorization']).not.toBe(h2['Authorization']);
    });
  });

  describe('MockDB CRUD', () => {
    it('should create and find contacts', () => {
      const contact = db.createContact({
        phoneNumber: '+1987654321',
        profileName: 'Alice',
        organizationId: 'org-1',
      });

      expect(contact.id).toBeDefined();
      expect(contact.profileName).toBe('Alice');

      const found = db.findFirst('contact', {
        where: { phoneNumber: '+1987654321' },
      });
      expect(found).not.toBeNull();
      expect((found as any).profileName).toBe('Alice');
    });

    it('should enforce organization isolation', () => {
      db.createContact({ phoneNumber: '+1111', organizationId: 'org-a' });
      db.createContact({ phoneNumber: '+2222', organizationId: 'org-b' });

      const orgAContacts = db.findMany('contact', {
        where: { organizationId: 'org-a' },
      });
      expect(orgAContacts).toHaveLength(1);

      const orgBContacts = db.findMany('contact', {
        where: { organizationId: 'org-b' },
      });
      expect(orgBContacts).toHaveLength(1);
    });

    it('should update contacts', () => {
      const contact = db.createContact({ profileName: 'Old Name' });

      db.update('contact', { id: contact.id as string }, { profileName: 'New Name' });

      const updated = db.findFirst('contact', {
        where: { id: contact.id as string },
      });
      expect((updated as any).profileName).toBe('New Name');
    });

    it('should delete contacts', () => {
      const contact = db.createContact();
      expect(db.count('contact')).toBe(1);

      db.delete('contact', { id: contact.id as string });
      expect(db.count('contact')).toBe(0);
    });

    it('should filter contacts by tags', () => {
      db.createContact({ phoneNumber: '+1111', tags: ['vip'] });
      db.createContact({ phoneNumber: '+2222', tags: ['regular'] });
      db.createContact({ phoneNumber: '+3333', tags: ['vip', 'new'] });

      const vipContacts = db.findMany('contact', {
        where: { tags: { contains: 'vip' } },
      });
      expect(vipContacts).toHaveLength(2);
    });

    it('should support cursor-like ordering', () => {
      db.createContact({ phoneNumber: '+1000', createdAt: '2024-01-01' });
      db.createContact({ phoneNumber: '+2000', createdAt: '2024-01-02' });
      db.createContact({ phoneNumber: '+3000', createdAt: '2024-01-03' });

      const sorted = db.findMany('contact', {
        orderBy: { createdAt: 'desc' },
        take: 2,
      });
      expect(sorted).toHaveLength(2);
      expect((sorted[0] as any).phoneNumber).toBe('+3000');
      expect((sorted[1] as any).phoneNumber).toBe('+2000');
    });
  });

  describe('Organization seeding', () => {
    it('should create org with complete lifecycle', () => {
      const org = db.createOrg({ name: 'Acme Corp' });
      expect(org.name).toBe('Acme Corp');

      const user = db.createUser({ organizationId: org.id, email: 'admin@acme.com' });
      expect(user.organizationId).toBe(org.id);

      const contact = db.createContact({ organizationId: org.id });
      expect(contact.organizationId).toBe(org.id);

      const orgContacts = db.findMany('contact', {
        where: { organizationId: org.id },
      });
      expect(orgContacts).toHaveLength(1);

      const otherOrgContacts = db.findMany('contact', {
        where: { organizationId: 'other-org' },
      });
      expect(otherOrgContacts).toHaveLength(0);
    });
  });
});
