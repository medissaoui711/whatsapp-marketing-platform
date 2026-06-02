import { Hub } from '../hub';
import { Client } from '../client';
import { MessageType } from '../types';
import { randomUUID } from 'crypto';

class MockClient extends Client {
  public receivedMessages: unknown[] = [];

  constructor(hub: Hub, userId: string, orgId: string) {
    super(hub, null, userId, orgId);
  }

  sendToClient(message: unknown): void {
    this.receivedMessages.push(message);
  }
}

describe('WebSocket Hub', () => {
  let hub: Hub;

  beforeEach(() => {
    hub = new Hub();
  });

  describe('register / unregister', () => {
    it('should register a client', () => {
      const orgId = randomUUID();
      const userId = randomUUID();
      const client = new MockClient(hub, userId, orgId);

      hub.register(client);

      expect(hub.getClientCount()).toBe(1);
      expect(hub.isUserOnline(orgId, userId)).toBe(true);
    });

    it('should register multiple clients for same user', () => {
      const orgId = randomUUID();
      const userId = randomUUID();
      const client1 = new MockClient(hub, userId, orgId);
      const client2 = new MockClient(hub, userId, orgId);

      hub.register(client1);
      hub.register(client2);

      expect(hub.getClientCount()).toBe(2);
    });

    it('should unregister a client', () => {
      const orgId = randomUUID();
      const userId = randomUUID();
      const client = new MockClient(hub, userId, orgId);

      hub.register(client);
      expect(hub.getClientCount()).toBe(1);

      hub.unregister(client);
      expect(hub.getClientCount()).toBe(0);
    });

    it('should not register a client without orgId', () => {
      const client = new MockClient(hub, randomUUID(), '');
      hub.register(client);
      expect(hub.getClientCount()).toBe(0);
    });

    it('should not register a client without userId', () => {
      const client = new MockClient(hub, '', randomUUID());
      hub.register(client);
      expect(hub.getClientCount()).toBe(0);
    });

    it('should clean up empty org after unregistering last user', () => {
      const orgId = randomUUID();
      const userId = randomUUID();
      const client = new MockClient(hub, userId, orgId);

      hub.register(client);
      hub.unregister(client);

      expect(hub.getClientCount()).toBe(0);
      expect(hub.isUserOnline(orgId, userId)).toBe(false);
    });
  });

  describe('broadcast', () => {
    it('should broadcast to all clients in org', () => {
      const orgId = randomUUID();
      const userId1 = randomUUID();
      const userId2 = randomUUID();
      const client1 = new MockClient(hub, userId1, orgId);
      const client2 = new MockClient(hub, userId2, orgId);

      hub.register(client1);
      hub.register(client2);

      const message = { type: MessageType.NEW_MESSAGE, payload: 'test' };
      hub.broadcastToOrg(orgId, message);

      expect(client1.receivedMessages).toHaveLength(1);
      expect(client2.receivedMessages).toHaveLength(1);
      expect(client1.receivedMessages[0]).toEqual(message);
    });

    it('should broadcast only to specific user', () => {
      const orgId = randomUUID();
      const userId1 = randomUUID();
      const userId2 = randomUUID();
      const client1 = new MockClient(hub, userId1, orgId);
      const client2 = new MockClient(hub, userId2, orgId);

      hub.register(client1);
      hub.register(client2);

      const message = { type: MessageType.PERMISSIONS_UPDATED, payload: 'perms' };
      hub.broadcastToUser(orgId, userId1, message);

      expect(client1.receivedMessages).toHaveLength(1);
      expect(client2.receivedMessages).toHaveLength(0);
    });

    it('should broadcast to multiple users', () => {
      const orgId = randomUUID();
      const userId1 = randomUUID();
      const userId2 = randomUUID();
      const userId3 = randomUUID();
      const client1 = new MockClient(hub, userId1, orgId);
      const client2 = new MockClient(hub, userId2, orgId);
      const client3 = new MockClient(hub, userId3, orgId);

      hub.register(client1);
      hub.register(client2);
      hub.register(client3);

      const message = { type: MessageType.STATUS_UPDATE, payload: 'update' };
      hub.broadcastToUsers(orgId, [userId1, userId2], message);

      expect(client1.receivedMessages).toHaveLength(1);
      expect(client2.receivedMessages).toHaveLength(1);
      expect(client3.receivedMessages).toHaveLength(0);
    });

    it('should do nothing when broadcasting to empty org', () => {
      const message = { type: MessageType.PING, payload: null };
      expect(() => hub.broadcastToOrg(randomUUID(), message)).not.toThrow();
    });
  });

  describe('online status', () => {
    it('should return online users', () => {
      const orgId = randomUUID();
      const userId1 = randomUUID();
      const userId2 = randomUUID();
      const offlineUser = randomUUID();

      hub.register(new MockClient(hub, userId1, orgId));
      hub.register(new MockClient(hub, userId2, orgId));

      const online = hub.onlineUserIds(orgId);
      expect(online).toContain(userId1);
      expect(online).toContain(userId2);
      expect(online).not.toContain(offlineUser);
    });

    it('should filter online users from list', () => {
      const orgId = randomUUID();
      const onlineUser = randomUUID();
      const offlineUser = randomUUID();

      hub.register(new MockClient(hub, onlineUser, orgId));

      const filtered = hub.filterOnlineUsers(orgId, [onlineUser, offlineUser]);
      expect(filtered).toContain(onlineUser);
      expect(filtered).not.toContain(offlineUser);
    });

    it('should return false for offline user', () => {
      const orgId = randomUUID();
      const userId = randomUUID();
      expect(hub.isUserOnline(orgId, userId)).toBe(false);
    });

    it('should return empty array for org with no online users', () => {
      expect(hub.onlineUserIds(randomUUID())).toEqual([]);
    });

    it('should return empty array from filterOnlineUsers for unknown org', () => {
      expect(hub.filterOnlineUsers(randomUUID(), [randomUUID()])).toEqual([]);
    });
  });
});


