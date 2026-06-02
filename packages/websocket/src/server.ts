import WebSocket, { WebSocketServer } from 'ws';
import type { Server as HTTPServer } from 'http';
import { Hub } from './hub';
import { Client } from './client';
import type { AuthenticateFn } from './types';

export interface WebSocketServerOptions {
  server: HTTPServer;
  path?: string;
  authenticate: AuthenticateFn;
}

export class WSServer {
  private wss: WebSocketServer;
  private hub: Hub;
  private authenticate: AuthenticateFn;

  constructor(options: WebSocketServerOptions) {
    this.wss = new WebSocketServer({
      server: options.server,
      path: options.path || '/ws',
    });
    this.hub = new Hub(console);
    this.authenticate = options.authenticate;

    this.setup();
  }

  private setup(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      console.log(`New WebSocket connection from ${req.socket.remoteAddress}`);

      const client = Client.newUnauthenticated(this.hub, ws, this.authenticate);

      client.readPump();
      client.writePump();

      ws.on('error', (error) => {
        console.error('WebSocket connection error:', error);
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
      });
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  }

  getHub(): Hub {
    return this.hub;
  }

  close(): void {
    this.wss.close();
  }
}


