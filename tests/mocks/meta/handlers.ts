import { MockServer } from '../mock-server';

export function setupMetaWebhookMocks(server: MockServer): void {
  server.get('/webhook', (_, path) => {
    const url = new URL(path, `http://localhost`);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === 'test-verify-token') {
      return { status: 200, body: challenge || 'challenge_ok' };
    }
    return { status: 403, body: { error: 'Forbidden' } };
  });

  server.post('/webhook', () => ({
    status: 200,
    body: { success: true },
  }));
}
