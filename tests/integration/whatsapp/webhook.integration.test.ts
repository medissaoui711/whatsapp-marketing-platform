import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MockDB, createMockDB } from '../../helpers/db-helper';
import { MockServer } from '../../mocks/mock-server';
import { setupWhatsAppMocks, setupWhatsAppErrorMocks } from '../../mocks/whatsapp/handlers';
import { setupMetaWebhookMocks } from '../../mocks/meta/handlers';
import messageTextPayload from '../../mocks/whatsapp/payloads/message-text.json';
import messageDeliveredPayload from '../../mocks/whatsapp/payloads/message-delivered.json';
import messageReadPayload from '../../mocks/whatsapp/payloads/message-read.json';
import messageFailedPayload from '../../mocks/whatsapp/payloads/message-failed.json';

describe('WhatsApp Webhook Integration', () => {
  let server: MockServer;
  let db: MockDB;

  beforeAll(async () => {
    server = new MockServer();
    setupWhatsAppMocks(server);
    setupMetaWebhookMocks(server);
    await server.start();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    db = createMockDB();
    db.reset();
  });

  const getWebhookUrl = () => `${server.url}/webhook`;

  describe('Meta Webhook Verification', () => {
    it('should verify webhook with correct token', async () => {
      const url = `${getWebhookUrl()}?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=challenge_ok`;
      const res = await fetch(url);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe('"challenge_ok"');
    });

    it('should reject webhook with wrong token', async () => {
      const url = `${getWebhookUrl()}?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=challenge_ok`;
      const res = await fetch(url);
      expect(res.status).toBe(403);
    });

    it('should reject without mode parameter', async () => {
      const url = `${getWebhookUrl()}?hub.verify_token=test-verify-token&hub.challenge=challenge_ok`;
      const res = await fetch(url);
      expect(res.status).toBe(403);
    });
  });

  describe('Message webhook payloads', () => {
    it('should process incoming text message webhook', async () => {
      const res = await fetch(getWebhookUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageTextPayload),
      });
      expect(res.status).toBe(200);

      const messages = (messageTextPayload.entry[0].changes[0].value as any).messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].text.body).toBe('Hello, this is a test message');
      expect(messages[0].from).toBe('5511999999999');
      expect(messages[0].type).toBe('text');
    });

    it('should process delivery status webhook', async () => {
      const res = await fetch(getWebhookUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageDeliveredPayload),
      });
      expect(res.status).toBe(200);

      const status = (messageDeliveredPayload.entry[0].changes[0].value as any).statuses[0];
      expect(status.status).toBe('delivered');
      expect(status.recipient_id).toBe('5511999999999');
    });

    it('should process read status webhook', async () => {
      const res = await fetch(getWebhookUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageReadPayload),
      });
      expect(res.status).toBe(200);

      const status = (messageReadPayload.entry[0].changes[0].value as any).statuses[0];
      expect(status.status).toBe('read');
    });

    it('should process failed message webhook', async () => {
      const res = await fetch(getWebhookUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageFailedPayload),
      });
      expect(res.status).toBe(200);

      const status = (messageFailedPayload.entry[0].changes[0].value as any).statuses[0];
      expect(status.status).toBe('failed');
      expect(status.errors).toHaveLength(1);
      expect(status.errors[0].code).toBe(131026);
    });
  });

  describe('WhatsApp API message sending mocks', () => {
    it('should mock successful message send', async () => {
      const res = await fetch(`${server.url}/v21.0/test-phone/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: '5511999999999',
          type: 'text',
          text: { body: 'Hello!' },
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.messages[0].id).toMatch(/^wamid\.mock\./);
    });

    it('should return rate limit error for mocked errors', async () => {
      const errorServer = new MockServer();
      setupWhatsAppErrorMocks(errorServer, 429);
      await errorServer.start();

      const res = await fetch(`${errorServer.url}/any/messages`, {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error.code).toBe(429);

      await errorServer.close();
    });

    it('should return server error for 500 mocked errors', async () => {
      const errorServer = new MockServer();
      setupWhatsAppErrorMocks(errorServer, 500);
      await errorServer.start();

      const res = await fetch(`${errorServer.url}/any/messages`, {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(res.status).toBe(500);

      await errorServer.close();
    });
  });
});
