import { createServer } from 'node:http'
import type { Server } from 'node:http'

export interface MockRequest {
  method: string
  path: string
  token?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any
}

export interface MockResponse {
  status: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any
  /** Hold the response back, to trip the client timeout. */
  delayMs?: number
}

export interface MockLettermint {
  baseUrl: string
  requests: MockRequest[]
  /** Response for the next request only. */
  respondOnceWith: (response: MockResponse) => void
  close: () => Promise<void>
}

const accepted: MockResponse = {
  status: 200,
  body: { message_id: 'msg_mock', status: 'pending' },
}

/**
 * Stands in for the Lettermint API so the server tests can assert what the
 * module put on the wire without an API key or network access.
 */
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
        body: raw ? JSON.parse(raw) : undefined,
      })

      const response = queued.shift() || accepted

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
