import { MockServer } from '../mock-server';

export type WhatsAppConfig = {
  graphApiVersion?: string;
  baseUrl?: string;
};

export function setupWhatsAppMocks(server: MockServer, config: WhatsAppConfig = {}): void {
  const apiVersion = config.graphApiVersion || 'v21.0';

  server.post(`/${apiVersion}/*/messages`, () => ({
    status: 200,
    body: {
      messaging_product: 'whatsapp',
      contacts: [{ input: '+1234567890', wa_id: '1234567890' }],
      messages: [{ id: `wamid.mock.${Date.now()}` }],
    },
  }));

  server.get('/*/phone_numbers', () => ({
    status: 200,
    body: {
      data: [
        {
          id: 'phone-id-1',
          display_phone_number: '+1234567890',
          verified_name: 'Test Business',
          quality_rating: 'GREEN',
        },
      ],
    },
  }));

  server.get('*fields=id,name', () => ({
    status: 200,
    body: { id: 'biz-id-1', name: 'Test Business Co' },
  }));

  server.post('*/subscribed_apps', () => ({
    status: 200,
    body: { success: true },
  }));

  server.get('*whatsapp_business_manager_messaging_limit', () => ({
    status: 200,
    body: { whatsapp_business_manager_messaging_limit: 'TIER_10K' },
  }));
}

export function setupWhatsAppErrorMocks(server: MockServer, errorCode: number): void {
  server.post('*/messages', () => ({
    status: errorCode,
    body: {
      error: {
        message: 'Mocked error',
        code: errorCode,
        type: errorCode === 429 ? 'RATE_LIMIT' : 'API_ERROR',
        fbtrace_id: 'mock-trace-id',
      },
    },
  }));
}
