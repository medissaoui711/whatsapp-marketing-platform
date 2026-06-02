import { test as base } from '@playwright/test';
import { MockServer } from '../../mocks/mock-server';
import { setupWhatsAppMocks } from '../../mocks/whatsapp/handlers';
import { setupMetaWebhookMocks } from '../../mocks/meta/handlers';

export type MockFixtures = {
  mockServer: MockServer;
};

export const test = base.extend<MockFixtures>({
  mockServer: async ({}, use) => {
    const server = new MockServer();
    setupWhatsAppMocks(server);
    setupMetaWebhookMocks(server);
    await server.start();

    process.env.WHATSAPP_API_URL = server.url;
    process.env.META_WEBHOOK_URL = server.url;

    await use(server);

    await server.close();
    delete process.env.WHATSAPP_API_URL;
    delete process.env.META_WEBHOOK_URL;
  },
});

export { expect } from '@playwright/test';
