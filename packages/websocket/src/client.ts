import WebSocket from 'ws';
import type { Hub } from './hub';
import type { WSMessage, AuthPayload, SetContactPayload, AuthenticateFn } from './types';
import { MessageType } from './types';

const AUTH_TIMEOUT = 5_000;
const PING_PERIOD = 54_000;

export class Client {
  private hub: Hub;
  private conn: WebSocket | null;
  private userID: string | null = null;
  private organizationID: string | null = null;
  private authenticated = false;
  private authFn: AuthenticateFn | null = null;
  private currentContact: string | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    hub: Hub,
    conn: WebSocket | null,
    userID: string | null,
    orgID: string | null,
    authFn?: AuthenticateFn,
  ) {
    this.hub = hub;
    this.conn = conn;
    this.userID = userID;
    this.organizationID = orgID;
    this.authenticated = userID !== null;
    if (authFn) this.authFn = authFn;
  }

  static newUnauthenticated(hub: Hub, conn: WebSocket, authFn: AuthenticateFn): Client {
    return new Client(hub, conn, null, null, authFn);
  }

  async readPump(): Promise<void> {
    if (!this.conn) return;

    try {
      if (!this.authenticated) {
        const authMessage = await this.waitForMessageWithTimeout(AUTH_TIMEOUT);
        if (!authMessage) {
          this.conn.close(1002, 'authentication timeout');
          return;
        }
        if (!(await this.handleAuthMessage(authMessage))) {
          this.conn.close(1002, 'authentication failed');
          return;
        }
      }

      this.conn.on('message', async (data: WebSocket.Data) => {
        const raw = data.toString();
        await this.handleMessage(raw);
      });

      this.conn.on('close', () => {
        if (this.authenticated) {
          this.hub.unregister(this);
        }
      });

      this.conn.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    } catch (error) {
      console.error('ReadPump error:', error);
      if (this.authenticated) {
        this.hub.unregister(this);
      } else if (this.conn) {
        this.conn.close();
      }
    }
  }

  writePump(): void {
    if (!this.conn) return;

    this.pingInterval = setInterval(() => {
      if (this.conn && this.conn.readyState === WebSocket.OPEN && this.authenticated) {
        this.conn.ping();
      }
    }, PING_PERIOD);

    this.conn.on('pong', () => {
      // connection alive
    });
  }

  sendToClient(message: WSMessage): void {
    if (!this.conn || this.conn.readyState !== WebSocket.OPEN) return;
    if (!this.authenticated) return;
    try {
      this.conn.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send message to client:', error);
    }
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  getUserID(): string | null {
    return this.userID;
  }

  getOrgID(): string | null {
    return this.organizationID;
  }

  getCurrentContact(): string | null {
    return this.currentContact;
  }

  close(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
  }

  private waitForMessageWithTimeout(timeoutMs: number): Promise<string | null> {
    return new Promise((resolve) => {
      if (!this.conn) {
        resolve(null);
        return;
      }

      const timer = setTimeout(() => {
        this.conn?.off('message', handler);
        resolve(null);
      }, timeoutMs);

      const handler = (data: WebSocket.Data) => {
        clearTimeout(timer);
        resolve(data.toString());
      };

      this.conn.once('message', handler);
    });
  }

  private async handleAuthMessage(data: string): Promise<boolean> {
    try {
      const msg = JSON.parse(data) as WSMessage;

      if (msg.type !== MessageType.AUTH) {
        console.warn(`Expected auth message, got ${msg.type}`);
        return false;
      }

      if (!msg.payload || !this.authFn) return false;

      const payload = msg.payload as AuthPayload;
      if (!payload.token) return false;

      const { userId, orgId } = await this.authFn(payload.token);

      this.userID = userId;
      this.organizationID = orgId;
      this.authenticated = true;

      this.hub.register(this);

      console.info(`WebSocket client authenticated: user=${userId}, org=${orgId}`);
      return true;
    } catch (error) {
      console.error('Failed to unmarshal auth message:', error);
      return false;
    }
  }

  private async handleMessage(data: string): Promise<void> {
    try {
      const msg = JSON.parse(data) as WSMessage;

      switch (msg.type) {
        case MessageType.SET_CONTACT:
          this.handleSetContact(msg.payload);
          break;
        case MessageType.PING:
          this.sendPong();
          break;
      }
    } catch (error) {
      console.error('Failed to unmarshal client message:', error);
    }
  }

  private handleSetContact(payload: unknown): void {
    try {
      const setContact = payload as SetContactPayload;
      this.currentContact = setContact.contactId || null;
    } catch (error) {
      console.error('Failed to parse set_contact payload:', error);
    }
  }

  private sendPong(): void {
    this.sendToClient({ type: MessageType.PONG, payload: null });
  }
}


