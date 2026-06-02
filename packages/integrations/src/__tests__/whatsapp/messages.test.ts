import { WhatsAppClient } from '../../whatsapp/client'
import { PhoneRecipient } from '../../types/whatsapp'
import { setupTestServer, mockAccount, type TestServerTransport } from './helpers'

describe('WhatsAppClient - Messages', () => {
  let client: WhatsAppClient
  let server: TestServerTransport
  const account = mockAccount()
  const recipient = new PhoneRecipient('5511999999999')

  beforeEach(async () => {
    server = await setupTestServer()
    client = new WhatsAppClient()
    client.setBaseURL(server.url)
  })

  afterEach(() => {
    server.server.close()
  })

  describe('sendInteractiveButtons', () => {
    it('should send up to 3 buttons as button type', async () => {
      const msgId = await client.sendInteractiveButtons(account, recipient, 'Choose option', [
        { id: '1', title: 'Yes' },
        { id: '2', title: 'No' },
      ])
      expect(msgId).toBe('test_msg_id')
      expect(((server.capturedBody.interactive as any) as any).type).toBe('button')
      expect(((server.capturedBody.interactive as any) as any).action.buttons).toHaveLength(2)
    })

    it('should send more than 3 buttons as list type', async () => {
      const msgId = await client.sendInteractiveButtons(account, recipient, 'Pick one', [
        { id: '1', title: 'A' },
        { id: '2', title: 'B' },
        { id: '3', title: 'C' },
        { id: '4', title: 'D' },
      ])
      expect(msgId).toBe('test_msg_id')
      expect(((server.capturedBody.interactive as any) as any).type).toBe('list')
      expect(((server.capturedBody.interactive as any) as any).action.sections[0].rows).toHaveLength(4)
    })

    it('should reject empty buttons', async () => {
      await expect(
        client.sendInteractiveButtons(account, recipient, 'text', [])
      ).rejects.toThrow('At least one button is required')
    })

    it('should reject more than 10 buttons', async () => {
      const many = Array.from({ length: 11 }, (_, i) => ({ id: String(i), title: `Btn ${i}` }))
      await expect(
        client.sendInteractiveButtons(account, recipient, 'text', many)
      ).rejects.toThrow('Maximum 10 buttons allowed')
    })

    it('should set recipient type to individual', async () => {
      await client.sendInteractiveButtons(account, recipient, 'text', [{ id: '1', title: 'OK' }])
      expect(server.capturedBody.recipient_type).toBe('individual')
    })

    it('should truncate button titles longer than 20 chars for button type', async () => {
      await client.sendInteractiveButtons(account, recipient, 'text', [
        { id: '1', title: 'This is a very long button title that should be truncated' },
      ])
      const title = (server.capturedBody.interactive as any).action.buttons[0].reply.title
      expect(title.length).toBeLessThanOrEqual(20)
    })

    it('should truncate list row titles longer than 24 chars', async () => {
      await client.sendInteractiveButtons(account, recipient, 'text', [
        { id: '1', title: 'A' },
        { id: '2', title: 'B' },
        { id: '3', title: 'C' },
        { id: '4', title: 'This is a very long row title that exceeds 24 chars' },
      ])
      const title = (server.capturedBody.interactive as any).action.sections[0].rows[3].title
      expect(title.length).toBeLessThanOrEqual(24)
    })

    it('should set messaging_product to whatsapp', async () => {
      await client.sendInteractiveButtons(account, recipient, 'text', [{ id: '1', title: 'OK' }])
      expect(server.capturedBody.messaging_product).toBe('whatsapp')
    })
  })

  describe('sendCTAURLButton', () => {
    it('should send a CTA URL button message', async () => {
      const msgId = await client.sendCTAURLButton(account, recipient, 'Visit us', 'Click here', 'https://example.com')
      expect(msgId).toBe('test_msg_id')
      expect((server.capturedBody.interactive as any).type).toBe('cta_url')
      expect((server.capturedBody.interactive as any).action.parameters.url).toBe('https://example.com')
    })

    it('should reject empty button text', async () => {
      await expect(
        client.sendCTAURLButton(account, recipient, 'text', '', 'https://example.com')
      ).rejects.toThrow('Button text and URL are required')
    })

    it('should reject empty URL', async () => {
      await expect(
        client.sendCTAURLButton(account, recipient, 'text', 'Click', '')
      ).rejects.toThrow('Button text and URL are required')
    })

    it('should truncate display text to 20 chars', async () => {
      await client.sendCTAURLButton(account, recipient, 'text', 'A very long button label that should be shortened', 'https://example.com')
      expect((server.capturedBody.interactive as any).action.parameters.display_text.length).toBeLessThanOrEqual(20)
    })

    it('should set recipient via payload', async () => {
      await client.sendCTAURLButton(account, recipient, 'text', 'Click', 'https://example.com')
      expect(server.capturedBody.to).toBe('5511999999999')
    })
  })

  describe('sendVoiceCallButton', () => {
    it('should send a voice call button message', async () => {
      const msgId = await client.sendVoiceCallButton(account, recipient, 'Call us', 'Call now', '+5511999999999')
      expect(msgId).toBe('test_msg_id')
      expect((server.capturedBody.interactive as any).type).toBe('voice_call')
      expect((server.capturedBody.interactive as any).action.parameters.phone).toBe('+5511999999999')
    })

    it('should set messaging_product', async () => {
      await client.sendVoiceCallButton(account, recipient, 'text', 'Call', '+5511999999999')
      expect(server.capturedBody.messaging_product).toBe('whatsapp')
    })

    it('should truncate display text to 20 chars', async () => {
      await client.sendVoiceCallButton(account, recipient, 'text', 'Call us now please for support', '+5511999999999')
      expect((server.capturedBody.interactive as any).action.parameters.display_text.length).toBeLessThanOrEqual(20)
    })
  })

  describe('sendTemplateMessage', () => {
    it('should send a template message', async () => {
      const msgId = await client.sendTemplateMessage(account, recipient, 'hello_world', 'en_US')
      expect(msgId).toBe('test_msg_id')
      expect(server.capturedBody.type).toBe('template')
      expect((server.capturedBody.template as any).name).toBe('hello_world')
    })

    it('should include components when provided', async () => {
      const components = [{ type: 'body', parameters: [{ type: 'text', text: 'User' }] }]
      await client.sendTemplateMessage(account, recipient, 'welcome', 'en_US', components)
      expect((server.capturedBody.template as any).components).toEqual(components)
    })

    it('should omit components when not provided', async () => {
      await client.sendTemplateMessage(account, recipient, 'hello', 'en_US')
      expect((server.capturedBody.template as any).components).toBeUndefined()
    })

    it('should set language code', async () => {
      await client.sendTemplateMessage(account, recipient, 'test', 'pt_BR')
      expect((server.capturedBody.template as any).language.code).toBe('pt_BR')
    })

    it('should throw when Meta returns no message ID', async () => {
      server.setResponse({ messages: [] })
      await expect(
        client.sendTemplateMessage(account, recipient, 'hello', 'en_US')
      ).rejects.toThrow('No message ID in response')
    })
  })
})


