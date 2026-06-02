import { WhatsAppClient } from '../../whatsapp/client'
import { setupTestServer, mockAccount, type TestServerTransport } from './helpers'

describe('WhatsAppClient - Catalogs', () => {
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

  describe('createCatalog', () => {
    it('should create a catalog and return its ID', async () => {
      server.setResponse({ id: 'cat_123' })
      const id = await client.createCatalog(account, 'My Store')
      expect(id).toBe('cat_123')
      expect(server.capturedBody.name).toBe('My Store')
    })
  })

  describe('listCatalogs', () => {
    it('should list all catalogs', async () => {
      const catalogs = [
        { id: 'cat_1', name: 'Store A' },
        { id: 'cat_2', name: 'Store B' },
      ]
      server.setResponse({ data: catalogs })
      const result = await client.listCatalogs(account)
      expect(result).toEqual(catalogs)
    })

    it('should return empty array when no catalogs', async () => {
      server.setResponse({ data: [] })
      const result = await client.listCatalogs(account)
      expect(result).toEqual([])
    })
  })

  describe('createProduct', () => {
    it('should create a product and return its ID', async () => {
      server.setResponse({ id: 'prod_123' })
      const id = await client.createProduct(account, 'cat_1', {
        name: 'Widget',
        price: 9.99,
        currency: 'USD',
        url: 'https://example.com/widget',
        imageUrl: 'https://example.com/widget.jpg',
        retailerId: 'SKU001',
        description: 'A widget',
      })
      expect(id).toBe('prod_123')
      expect(server.capturedBody.name).toBe('Widget')
    })

    it('should convert price to string', async () => {
      server.setResponse({ id: 'p1' })
      await client.createProduct(account, 'cat_1', {
        name: 'Test',
        price: 19.99,
        currency: 'USD',
        url: 'https://example.com/test',
        imageUrl: 'https://example.com/test.jpg',
        retailerId: 'SKU002',
      })
      expect(server.capturedBody.price).toBe('19.99')
    })
  })
})


