export interface IMessageAdapter {
  send(payload: { to: string; content: string }): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export class MockWhatsAppAdapter implements IMessageAdapter {
  async send(payload: { to: string; content: string }) {
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log(`[MockWhatsApp] Sending to ${payload.to}: ${payload.content}`);
    return { success: true, messageId: `mock-${Date.now()}` };
  }
}

export class MockTelegramAdapter implements IMessageAdapter {
  async send(payload: { to: string; content: string }) {
    await new Promise(resolve => setTimeout(resolve, 150));
    console.log(`[MockTelegram] Sending to ${payload.to}: ${payload.content}`);
    return { success: true, messageId: `tg-${Date.now()}` };
  }
}

export function createAdapter(type: string): IMessageAdapter {
  switch (type) {
    case 'whatsapp':
      return new MockWhatsAppAdapter();
    case 'telegram':
      return new MockTelegramAdapter();
    default:
      throw new Error(`Unknown integration type: ${type}`);
  }
}


