import { WebhookParser } from '../../whatsapp/webhook'

describe('WebhookParser', () => {
  describe('verifyWebhook', () => {
    it('should return challenge on valid verification', () => {
      const result = WebhookParser.verifyWebhook('subscribe', 'abc123', 'challenge_value', 'abc123')
      expect(result).toBe('challenge_value')
    })

    it('should return null when mode is not subscribe', () => {
      const result = WebhookParser.verifyWebhook('unsubscribe', 'abc123', 'challenge_value', 'abc123')
      expect(result).toBeNull()
    })

    it('should return null when token does not match', () => {
      const result = WebhookParser.verifyWebhook('subscribe', 'wrong_token', 'challenge_value', 'abc123')
      expect(result).toBeNull()
    })

    it('should return null when both mode and token are wrong', () => {
      const result = WebhookParser.verifyWebhook('bad', 'wrong', 'challenge_value', 'correct_verify_token')
      expect(result).toBeNull()
    })
  })

  describe('extractMessages', () => {
    it('should extract messages from a standard webhook payload', () => {
      const body = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              messages: [{ id: 'wamid.123', from: '5511999999999', text: { body: 'Hello' } }],
            },
          }],
        }],
      }
      const messages = WebhookParser.extractMessages(body)
      expect(messages).toHaveLength(1)
      expect((messages[0] as any).id).toBe('wamid.123')
    })

    it('should return empty array when no messages in payload', () => {
      const body = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              statuses: [{ id: 'status1', status: 'read' }],
            },
          }],
        }],
      }
      expect(WebhookParser.extractMessages(body)).toEqual([])
    })

    it('should return empty array when entry is empty', () => {
      expect(WebhookParser.extractMessages({ entry: [] })).toEqual([])
    })

    it('should return empty array when body has no entry', () => {
      expect(WebhookParser.extractMessages({})).toEqual([])
    })

    it('should extract messages from multiple changes', () => {
      const body = {
        entry: [{
          changes: [
            { value: { messages: [{ id: 'msg1' }] } },
            { value: { messages: [{ id: 'msg2' }] } },
          ],
        }],
      }
      expect(WebhookParser.extractMessages(body)).toHaveLength(2)
    })
  })

  describe('extractStatuses', () => {
    it('should extract statuses from a webhook payload', () => {
      const body = {
        entry: [{
          changes: [{
            value: {
              statuses: [{ id: 'status1', status: 'read', timestamp: '1234567890' }],
            },
          }],
        }],
      }
      const statuses = WebhookParser.extractStatuses(body)
      expect(statuses).toHaveLength(1)
      expect((statuses[0] as any).status).toBe('read')
    })

    it('should return empty array when no statuses', () => {
      const body = { entry: [{ changes: [{ value: { messages: [{ id: 'm1' }] } }] }] }
      expect(WebhookParser.extractStatuses(body)).toEqual([])
    })
  })

  describe('hasMessages', () => {
    it('should return true when payload has messages', () => {
      const body = { entry: [{ changes: [{ value: { messages: [{ id: '1' }] } }] }] }
      expect(WebhookParser.hasMessages(body)).toBe(true)
    })

    it('should return false when payload has no messages', () => {
      const body = { entry: [{ changes: [{ value: {} }] }] }
      expect(WebhookParser.hasMessages(body)).toBe(false)
    })
  })

  describe('hasStatuses', () => {
    it('should return true when payload has statuses', () => {
      const body = { entry: [{ changes: [{ value: { statuses: [{ id: '1' }] } }] }] }
      expect(WebhookParser.hasStatuses(body)).toBe(true)
    })

    it('should return false when payload has no statuses', () => {
      const body = { entry: [{ changes: [{ value: {} }] }] }
      expect(WebhookParser.hasStatuses(body)).toBe(false)
    })
  })
})


