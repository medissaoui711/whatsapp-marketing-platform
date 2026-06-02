import type { Client } from './client';
import type { WSMessage, BroadcastMessage } from './types';

export class Hub {
  private clients: Map<string, Map<string, Set<Client>>> = new Map();

  constructor(private logger?: Console) {}

  register(client: Client): void {
    const orgId = client.getOrgID();
    const userId = client.getUserID();

    if (!orgId || !userId) {
      this.logger?.warn('Cannot register client without orgID/userID');
      return;
    }

    let orgClients = this.clients.get(orgId);
    if (!orgClients) {
      orgClients = new Map();
      this.clients.set(orgId, orgClients);
    }

    let userClients = orgClients.get(userId);
    if (!userClients) {
      userClients = new Set();
      orgClients.set(userId, userClients);
    }

    userClients.add(client);

    this.logger?.info('WebSocket client registered',
      `user_id=${userId}`, `org_id=${orgId}`,
      `user_connections=${userClients.size}`,
      `total_clients=${this.clientCount()}`);
  }

  unregister(client: Client): void {
    const orgId = client.getOrgID();
    const userId = client.getUserID();

    if (!orgId || !userId) return;

    const orgClients = this.clients.get(orgId);
    if (!orgClients) return;

    const userClients = orgClients.get(userId);
    if (!userClients) return;

    if (userClients.has(client)) {
      userClients.delete(client);
      client.close();

      if (userClients.size === 0) {
        orgClients.delete(userId);
      }

      if (orgClients.size === 0) {
        this.clients.delete(orgId);
      }
    }

    this.logger?.info('WebSocket client unregistered',
      `user_id=${userId}`, `org_id=${orgId}`,
      `total_clients=${this.clientCount()}`);
  }

  broadcast(msg: BroadcastMessage): void {
    const orgClients = this.clients.get(msg.orgId);
    if (!orgClients) return;

    if (msg.userId) {
      const userClients = orgClients.get(msg.userId);
      if (!userClients) return;
      for (const client of userClients) {
        client.sendToClient(msg.message);
      }
      return;
    }

    for (const userClients of orgClients.values()) {
      for (const client of userClients) {
        if (msg.contactId && client.getCurrentContact() !== msg.contactId) {
          continue;
        }
        client.sendToClient(msg.message);
      }
    }
  }

  broadcastToOrg(orgId: string, message: WSMessage): void {
    this.broadcast({ orgId, message });
  }

  broadcastToContact(orgId: string, contactId: string, message: WSMessage): void {
    this.broadcast({ orgId, contactId, message });
  }

  broadcastToUser(orgId: string, userId: string, message: WSMessage): void {
    this.broadcast({ orgId, userId, message });
  }

  broadcastToUsers(orgId: string, userIds: string[], message: WSMessage): void {
    for (const userId of userIds) {
      this.broadcastToUser(orgId, userId, message);
    }
  }

  // Query methods

  getClientCount(): number {
    return this.clientCount();
  }

  isUserOnline(orgId: string, userId: string): boolean {
    const orgClients = this.clients.get(orgId);
    if (!orgClients) return false;
    const userClients = orgClients.get(userId);
    return userClients !== undefined && userClients.size > 0;
  }

  onlineUserIds(orgId: string): string[] {
    const orgClients = this.clients.get(orgId);
    if (!orgClients) return [];
    const ids: string[] = [];
    for (const [uid, clients] of orgClients) {
      if (clients.size > 0) {
        ids.push(uid);
      }
    }
    return ids;
  }

  filterOnlineUsers(orgId: string, userIds: string[]): string[] {
    const orgClients = this.clients.get(orgId);
    if (!orgClients) return [];
    return userIds.filter(uid => {
      const userClients = orgClients.get(uid);
      return userClients !== undefined && userClients.size > 0;
    });
  }

  // Internal
  private clientCount(): number {
    let count = 0;
    for (const orgClients of this.clients.values()) {
      for (const userClients of orgClients.values()) {
        count += userClients.size;
      }
    }
    return count;
  }
}


