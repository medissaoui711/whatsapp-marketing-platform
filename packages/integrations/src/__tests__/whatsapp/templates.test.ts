import { WhatsAppClient } from '../../whatsapp/client'
import { setupTestServer, mockAccount, type TestServerTransport } from './helpers'

describe('WhatsAppClient - Template Management', () => {
  let client: WhatsAppClient
  let server: TestServerTransport
  const account = mockAccount()

  beforeEach(async () => {
    server = await setupTestServer()
    client = new WhatsAppClient()
    client.setBaseURL(server.url)
  })

  afterEach(() => {
    server.server.close()
  })

  describe('submitTemplate', () => {
    it('should submit a template successfully', async () => {
      server.setResponse({ id: '123456', status: 'PENDING', category: 'UTILITY' })

      const result = await client.submitTemplate(account, {
        name: 'hello_world',
        language: 'en_US',
        category: 'UTILITY',
        components: [
          { type: 'body', text: 'Hello {{1}}' },
        ],
      })

      expect(result.id).toBe('123456')
      expect(result.status).toBe('PENDING')
      expect(result.category).toBe('UTILITY')
    })

    it('should include allow_category_change when provided', async () => {
      server.setResponse({ id: '789', status: 'PENDING', category: 'MARKETING' })

      await client.submitTemplate(account, {
        name: 'promo',
        language: 'en_US',
        category: 'MARKETING',
        components: [{ type: 'body', text: 'Sale!' }],
        allowCategoryChange: true,
      })

      expect(server.capturedBody.allow_category_change).toBe(true)
    })

    it('should submit template with multiple components', async () => {
      server.setResponse({ id: '1', status: 'PENDING', category: 'UTILITY' })

      const components = [
        { type: 'header', parameters: [{ type: 'text', text: 'Hi' }] },
        { type: 'body', text: 'Welcome {{1}}' },
      ]

      await client.submitTemplate(account, {
        name: 'multi',
        language: 'en_US',
        category: 'UTILITY',
        components,
      })

      expect(server.capturedBody.components).toEqual(components)
    })

    it('should omit allow_category_change when not provided', async () => {
      server.setResponse({ id: '1', status: 'PENDING', category: 'UTILITY' })

      await client.submitTemplate(account, {
        name: 'test',
        language: 'en_US',
        category: 'UTILITY',
        components: [],
      })

      expect(server.capturedBody.allow_category_change).toBeUndefined()
    })
  })

  describe('fetchTemplates', () => {
    it('should fetch all templates', async () => {
      const templates = [
        { id: '1', name: 'hello', status: 'APPROVED', category: 'UTILITY' },
        { id: '2', name: 'welcome', status: 'PENDING', category: 'MARKETING' },
      ]
      server.setResponse({ data: templates })

      const result = await client.fetchTemplates(account)
      expect(result).toEqual(templates)
    })

    it('should return empty array when no templates', async () => {
      server.setResponse({ data: [] })
      const result = await client.fetchTemplates(account)
      expect(result).toEqual([])
    })

    it('should return empty array when response has no data field', async () => {
      server.setResponse({})
      const result = await client.fetchTemplates(account)
      expect(result).toEqual([])
    })
  })

  describe('deleteTemplate', () => {
    it('should delete a template by name', async () => {
      server.setResponse({ success: true })
      await expect(client.deleteTemplate(account, 'hello_world')).resolves.toBeUndefined()
      expect(server.capturedMethod).toBe('DELETE')
    })

    it('should include template name in query string', async () => {
      server.setResponse({ success: true })
      await client.deleteTemplate(account, 'my_template')
      expect(server.capturedHeaders.host).toBeDefined()
    })
  })
})


