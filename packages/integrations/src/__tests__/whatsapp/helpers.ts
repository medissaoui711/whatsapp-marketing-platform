import { createServer, Server, IncomingMessage, ServerResponse } from 'http'
import type { WhatsAppAccount } from '../../types/whatsapp'

export interface TestServerTransport {
  server: Server
  url: string
  port: number
  capturedBody: Record<string, unknown>
  capturedMethod: string
  capturedHeaders: Record<string, string>
  setResponse: (data: unknown, status?: number) => void
}

export async function setupTestServer(): Promise<TestServerTransport> {
  const transport: TestServerTransport = {
    server: null as unknown as Server,
    url: '',
    port: 0,
    capturedBody: {},
    capturedMethod: '',
    capturedHeaders: {},
    setResponse: () => {},
  }

  let responseData: unknown = { messages: [{ id: 'test_msg_id' }] }
  let responseStatus = 200

  transport.setResponse = (data: unknown, status = 200) => {
    responseData = data
    responseStatus = status
  }

  function collectBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = []
      req.on('data', (chunk: Buffer) => chunks.push(chunk))
      req.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8')
        try { resolve(raw ? JSON.parse(raw) : null) }
        catch { resolve(raw) }
      })
    })
  }

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    transport.capturedBody = (await collectBody(req)) as Record<string, unknown>
    transport.capturedMethod = req.method || ''
    transport.capturedHeaders = req.headers as Record<string, string>

    res.writeHead(responseStatus, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(responseData))
  })

  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const addr = server.address()
      if (addr && typeof addr === 'object') {
        transport.port = addr.port
        transport.url = `http://localhost:${addr.port}`
      }
      resolve()
    })
  })

  transport.server = server
  return transport
}

export function mockAccount(overrides?: Partial<WhatsAppAccount>): WhatsAppAccount {
  return {
    phoneId: '123456789',
    businessId: '987654321',
    apiVersion: 'v22.0',
    accessToken: 'test_access_token',
    ...overrides,
  }
}


