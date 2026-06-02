import { prisma } from '@repo/db';
import { getCache, CACHE_TTL, CACHE_PREFIX } from '@repo/cache';
import { generateWebhookSignature, dispatchWebhook, waitForWebhooks, __resetModuleState } from '../dispatcher';
import { randomUUID } from 'crypto';
import http from 'http';

jest.mock('@repo/db', () => ({
  prisma: {
    webhook: {
      findMany: jest.fn(),
    },
    webhookDeliveryLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@repo/cache', () => ({
  getCache: jest.fn(),
  CACHE_TTL: { WEBHOOKS: 3600 },
  CACHE_PREFIX: { WEBHOOKS: 'webhooks:' },
}));

describe('Webhook Dispatcher', () => {
  let mockCache: any;

  beforeEach(() => {
    jest.clearAllMocks();
    __resetModuleState();
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      isReady: jest.fn().mockReturnValue(true),
    };
    (getCache as jest.Mock).mockReturnValue(mockCache);
  });

  describe('generateWebhookSignature', () => {
    it('should generate HMAC-SHA256 signature', () => {
      const payload = '{"test":"data"}';
      const secret = 'my-secret-key';
      const signature = generateWebhookSignature(payload, secret);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBe(64);
    });

    it('should produce different signatures for different secrets', () => {
      const payload = '{"test":"data"}';
      const sig1 = generateWebhookSignature(payload, 'secret1');
      const sig2 = generateWebhookSignature(payload, 'secret2');
      expect(sig1).not.toBe(sig2);
    });

    it('should produce different signatures for different payloads', () => {
      const sig1 = generateWebhookSignature('payload1', 'secret');
      const sig2 = generateWebhookSignature('payload2', 'secret');
      expect(sig1).not.toBe(sig2);
    });
  });

  describe('dispatchWebhook', () => {
    it('should dispatch webhook successfully', async () => {
      let requestReceived = false;
      const server = createTestServer((_req, res) => {
        requestReceived = true;
        res.writeHead(200).end();
      });

      const webhook = createTestWebhook(server.url);
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([webhook]);
      mockCache.get.mockResolvedValue(null);

      await dispatchWebhook('org-123', 'message.incoming', { test: 'data' });
      await waitForWebhooks();

      expect(requestReceived).toBe(true);
      server.close();
    });

    it('should respect concurrency limit', async () => {
      let concurrentCount = 0;
      let maxConcurrent = 0;
      const requestsReceived: string[] = [];

      const server = createTestServer(async (_req, res) => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        requestsReceived.push(_req.url || '');
        await new Promise(resolve => setTimeout(resolve, 50));
        concurrentCount--;
        res.writeHead(200).end();
      });

      const webhooks = Array.from({ length: 15 }, (_, i) =>
        createTestWebhook(server.url, `webhook-${i}`),
      );
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue(webhooks);
      mockCache.get.mockResolvedValue(null);

      await dispatchWebhook('org-123', 'message.incoming', { test: 'data' });
      await waitForWebhooks();

      expect(maxConcurrent).toBeLessThanOrEqual(10);
      expect(requestsReceived.length).toBe(15);
      server.close();
    }, 15000);

    it('should retry on failure', async () => {
      let attemptCount = 0;
      const server = createTestServer((_req, res) => {
        attemptCount++;
        if (attemptCount < 3) {
          res.writeHead(500).end();
        } else {
          res.writeHead(200).end();
        }
      });

      const webhook = createTestWebhook(server.url);
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([webhook]);
      mockCache.get.mockResolvedValue(null);

      await dispatchWebhook('org-123', 'message.incoming', { test: 'data' });
      await waitForWebhooks();

      expect(attemptCount).toBe(3);
      server.close();
    }, 15000);

    it('should not call webhook for non-matching event', async () => {
      let requestReceived = false;
      const server = createTestServer((_req, res) => {
        requestReceived = true;
        res.writeHead(200).end();
      });

      const webhook = createTestWebhook(server.url, 'webhook-1', ['message.outgoing']);
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([webhook]);
      mockCache.get.mockResolvedValue(null);

      await dispatchWebhook('org-123', 'message.incoming', { test: 'data' });
      await waitForWebhooks();

      expect(requestReceived).toBe(false);
      server.close();
    });

    it('should not call inactive webhook', async () => {
      let requestReceived = false;
      const server = createTestServer((_req, res) => {
        requestReceived = true;
        res.writeHead(200).end();
      });

      const webhook = createTestWebhook(server.url, 'webhook-1', ['message.incoming'], false);
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([webhook]);
      mockCache.get.mockResolvedValue(null);

      await dispatchWebhook('org-123', 'message.incoming', { test: 'data' });
      await waitForWebhooks();

      expect(requestReceived).toBe(false);
      server.close();
    });

    it('should use cached webhooks', async () => {
      let requestReceived = false;
      const server = createTestServer((_req, res) => {
        requestReceived = true;
        res.writeHead(200).end();
      });

      const webhook = createTestWebhook(server.url);
      mockCache.get.mockResolvedValue([webhook]);
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([]);

      await dispatchWebhook('org-123', 'message.incoming', { test: 'data' });
      await waitForWebhooks();

      expect(requestReceived).toBe(true);
      expect(prisma.webhook.findMany).not.toHaveBeenCalled();
      server.close();
    });

    it('should handle HTTP timeout', async () => {
      let requestStarted = false;
      const server = createTestServer(async (_req, res) => {
        requestStarted = true;
        await new Promise(resolve => setTimeout(resolve, 15000));
        res.writeHead(200).end();
      });

      const webhook = createTestWebhook(server.url);
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([webhook]);
      mockCache.get.mockResolvedValue(null);

      await dispatchWebhook('org-123', 'message.incoming', { test: 'data' });
      await waitForWebhooks();

      expect(requestStarted).toBe(true);
      server.close();
    }, 45000);

    it('should log successful delivery', async () => {
      const server = createTestServer((_req, res) => {
        res.writeHead(200).end();
      });

      const webhook = createTestWebhook(server.url);
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([webhook]);
      mockCache.get.mockResolvedValue(null);

      await dispatchWebhook('org-123', 'message.incoming', { test: 'data' });
      await waitForWebhooks();

      expect(prisma.webhookDeliveryLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          webhookId: webhook.id,
          success: true,
        }),
      });
      server.close();
    });

    it('should log failed delivery after retries', async () => {
      const server = createTestServer((_req, res) => {
        res.writeHead(500).end();
      });

      const webhook = createTestWebhook(server.url);
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([webhook]);
      mockCache.get.mockResolvedValue(null);

      await dispatchWebhook('org-123', 'message.incoming', { test: 'data' });
      await waitForWebhooks();

      expect(prisma.webhookDeliveryLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          webhookId: webhook.id,
          success: false,
        }),
      });
      server.close();
    }, 15000);

    it('should include signature header when secret is provided', async () => {
      let receivedSignature: string | undefined;
      const server = createTestServer((req, res) => {
        const h = req.headers['x-webhook-signature'];
        receivedSignature = Array.isArray(h) ? h[0] : h;
        res.writeHead(200).end();
      });

      const webhook = createTestWebhook(server.url, 'webhook-1', ['message.incoming'], true, 'my-secret');
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([webhook]);
      mockCache.get.mockResolvedValue(null);

      await dispatchWebhook('org-123', 'message.incoming', { test: 'data' });
      await waitForWebhooks();

      expect(receivedSignature).toBeDefined();
      expect(receivedSignature?.length).toBe(64);
      server.close();
    });

    it('should handle multiple events for same webhook', async () => {
      const eventsReceived: string[] = [];
      const server = createTestServer((req, res) => {
        const body = JSON.parse((req as any).body || '{}');
        eventsReceived.push(body.event);
        res.writeHead(200).end();
      });

      const webhook = createTestWebhook(server.url, 'webhook-1', ['message.incoming', 'message.outgoing']);
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([webhook]);
      mockCache.get.mockResolvedValue(null);

      await dispatchWebhook('org-123', 'message.incoming', { test: 'incoming' });
      await dispatchWebhook('org-123', 'message.outgoing', { test: 'outgoing' });
      await waitForWebhooks();

      expect(eventsReceived).toContain('message.incoming');
      expect(eventsReceived).toContain('message.outgoing');
      server.close();
    });
  });

  describe('waitForWebhooks', () => {
    it('should resolve when queue is empty', async () => {
      await expect(waitForWebhooks()).resolves.toBeUndefined();
    });

    it('should wait for active workers to complete', async () => {
      let workerCompleted = false;
      const server = createTestServer(async (_req, res) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        workerCompleted = true;
        res.writeHead(200).end();
      });

      const webhook = createTestWebhook(server.url);
      (prisma.webhook.findMany as jest.Mock).mockResolvedValue([webhook]);
      mockCache.get.mockResolvedValue(null);

      await dispatchWebhook('org-123', 'message.incoming', { test: 'data' });
      await waitForWebhooks();

      expect(workerCompleted).toBe(true);
      server.close();
    });
  });
});

function createTestServer(
  handler: (req: http.IncomingMessage, res: http.ServerResponse) => void,
): { url: string; close: () => void } {
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk: string) => { body += chunk; });
    req.on('end', () => {
      (req as any).body = body;
      handler(req, res);
    });
  });
  server.listen(0);
  const address = server.address() as any;
  const port = typeof address === 'object' ? address.port : 0;
  return {
    url: `http://localhost:${port}`,
    close: () => server.close(),
  };
}

function createTestWebhook(
  url: string,
  id?: string,
  events: string[] = ['message.incoming'],
  isActive: boolean = true,
  secret?: string,
): any {
  return {
    id: id || randomUUID(),
    name: 'test-webhook',
    url,
    events,
    headers: {},
    secret,
    isActive,
  };
}


