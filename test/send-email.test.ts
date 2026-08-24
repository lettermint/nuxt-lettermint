import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SendEmailOptions } from '../src/runtime/server/utils/lettermint'

const runtimeConfig = vi.hoisted(() => ({ apiKey: 'test-api-key' }))

vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(() => ({
    lettermint: {
      apiKey: runtimeConfig.apiKey,
    },
  })),
}))

interface CapturedRequest {
  url: string
  headers: Record<string, string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any
}

let requests: CapturedRequest[] = []

function mockFetch(delayMs = 0) {
  return vi.fn(async (url: string, init: RequestInit) => {
    requests.push({
      url: String(url),
      headers: (init.headers || {}) as Record<string, string>,
      body: JSON.parse(String(init.body)),
    })

    if (delayMs) await new Promise(resolve => setTimeout(resolve, delayMs))

    return {
      ok: true,
      status: 200,
      json: async () => ({ message_id: 'msg_1', status: 'pending' }),
    }
  })
}

async function send(options: SendEmailOptions) {
  const { sendEmail } = await import('../src/runtime/server/utils/lettermint')
  return sendEmail(options)
}

const base = {
  from: 'sender@acme.com',
  to: 'recipient@acme.com',
  subject: 'Hello',
  text: 'Hi',
}

beforeEach(() => {
  requests = []
  runtimeConfig.apiKey = 'test-api-key'
  vi.resetModules()
  vi.stubGlobal('fetch', mockFetch())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sendEmail payload', () => {
  it('sends every recipient, not just the last one', async () => {
    await send({
      ...base,
      to: ['first@acme.com', 'second@acme.com'],
      cc: ['cc1@acme.com', 'cc2@acme.com'],
      bcc: 'bcc@acme.com',
      replyTo: ['reply1@acme.com', 'reply2@acme.com'],
    })

    expect(requests).toHaveLength(1)
    expect(requests[0]!.body.to).toEqual(['first@acme.com', 'second@acme.com'])
    expect(requests[0]!.body.cc).toEqual(['cc1@acme.com', 'cc2@acme.com'])
    expect(requests[0]!.body.bcc).toEqual(['bcc@acme.com'])
    expect(requests[0]!.body.reply_to).toEqual(['reply1@acme.com', 'reply2@acme.com'])
  })

  it('normalises a single recipient to an array', async () => {
    await send(base)

    expect(requests[0]!.body.to).toEqual(['recipient@acme.com'])
  })

  it('returns the SDK response', async () => {
    const result = await send(base)

    expect(result).toEqual({ message_id: 'msg_1', status: 'pending' })
  })

  it('forwards attachment content type and content id', async () => {
    await send({
      ...base,
      attachments: [
        { filename: 'invoice.pdf', content: 'YmFzZTY0', contentType: 'application/pdf' },
        { filename: 'logo.png', content: Buffer.from('png'), contentId: 'logo' },
      ],
    })

    expect(requests[0]!.body.attachments).toEqual([
      { filename: 'invoice.pdf', content: 'YmFzZTY0', content_type: 'application/pdf' },
      { filename: 'logo.png', content: Buffer.from('png').toString('base64'), content_id: 'logo' },
    ])
  })

  it('maps a string tag list onto the single tag field', async () => {
    await send({ ...base, tags: ['campaign-123'] })

    expect(requests[0]!.body.tag).toBe('campaign-123')
    expect(requests[0]!.body.tags).toBeUndefined()
  })

  it('maps key/value tags onto the tags field', async () => {
    await send({ ...base, tags: [{ name: 'campaign', value: '123' }] })

    expect(requests[0]!.body.tags).toEqual([{ name: 'campaign', value: '123' }])
    expect(requests[0]!.body.tag).toBeUndefined()
  })

  it('passes headers, metadata and route through', async () => {
    await send({
      ...base,
      headers: { 'X-Custom': 'value' },
      metadata: { order: '42' },
      route: 'transactional',
    })

    expect(requests[0]!.body.headers).toEqual({ 'X-Custom': 'value' })
    expect(requests[0]!.body.metadata).toEqual({ order: '42' })
    expect(requests[0]!.body.route).toBe('transactional')
  })

  it('sends the idempotency key as a header', async () => {
    await send({ ...base, idempotencyKey: 'order-42' })

    expect(requests[0]!.headers['Idempotency-Key']).toBe('order-42')
  })

  it('authenticates with the configured api key', async () => {
    await send(base)

    expect(requests[0]!.headers['x-lettermint-token']).toBe('test-api-key')
    expect(requests[0]!.url).toBe('https://api.lettermint.co/v1/send')
  })

  it('keeps concurrent sends isolated from each other', async () => {
    vi.stubGlobal('fetch', mockFetch(20))
    const { sendEmail } = await import('../src/runtime/server/utils/lettermint')

    await Promise.all([
      sendEmail({ ...base, to: 'one@acme.com', subject: 'First' }),
      sendEmail({ ...base, to: 'two@acme.com', subject: 'Second' }),
    ])

    expect(requests).toHaveLength(2)
    const bySubject = Object.fromEntries(requests.map(r => [r.body.subject, r.body.to]))
    expect(bySubject).toEqual({
      First: ['one@acme.com'],
      Second: ['two@acme.com'],
    })
  })
})

describe('sendEmail configuration errors', () => {
  it('throws a helpful error when no api key is configured', async () => {
    runtimeConfig.apiKey = ''

    await expect(send(base)).rejects.toThrow('Lettermint API key is not configured')
  })
})
