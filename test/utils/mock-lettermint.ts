import { createServer } from 'node:http'
import type { Server } from 'node:http'

export interface MockRequest {
  method: string
  path: string
  token?: string
  authorization?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any
}

export interface MockResponse {
  status: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any
  delayMs?: number
}

export interface MockLettermint {
  baseUrl: string
  requests: MockRequest[]
  respondOnceWith: (response: MockResponse) => void
  close: () => Promise<void>
}

const accepted: MockResponse = {
  status: 200,
  body: { message_id: 'msg_mock', status: 'pending' },
}

// Stands in for the Lettermint API, so the tests can assert what the module put
// on the wire without an API key or network access.
export async function startMockLettermint(): Promise<MockLettermint> {
  const requests: MockRequest[] = []
  const queued: MockResponse[] = []

  const server: Server = createServer((req, res) => {
    const chunks: Buffer[] = []

    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString()

      requests.push({
        method: req.method || '',
        path: req.url || '',
        token: req.headers['x-lettermint-token'] as string | undefined,
        authorization: req.headers.authorization,
        body: raw ? JSON.parse(raw) : undefined,
      })

      if (req.url?.endsWith('/ping')) {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('pong\n')
        return
      }

      // The batch endpoint answers with one result per message.
      const fallback = req.url?.endsWith('/send/batch')
        ? { status: 200, body: (requests.at(-1)?.body as unknown[]).map((_, index) => ({ message_id: `msg_mock_${index}`, status: 'pending' })) }
        : accepted

      const response = queued.shift() || fallback

      setTimeout(() => {
        res.writeHead(response.status, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(response.body))
      }, response.delayMs || 0)
    })
  })

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))

  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0

  return {
    baseUrl: `http://127.0.0.1:${port}/v1`,
    requests,
    respondOnceWith: response => queued.push(response),
    close: () => new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve())
    }),
  }
}
