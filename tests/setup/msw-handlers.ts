import { MockServer } from '../mocks/mock-server';
import { setupWhatsAppMocks } from '../mocks/whatsapp/handlers';
import { setupMetaWebhookMocks } from '../mocks/meta/handlers';

export let mockServer: MockServer;

export async function startMockServer(): Promise<MockServer> {
  mockServer = new MockServer();
  setupWhatsAppMocks(mockServer);
  setupMetaWebhookMocks(mockServer);
  await mockServer.start();
  return mockServer;
}

export async function stopMockServer(): Promise<void> {
  if (mockServer) {
    await mockServer.close();
  }
}
