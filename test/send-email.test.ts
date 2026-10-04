import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { LettermintTag, SendEmailOptions } from '../src/runtime/server/utils/lettermint'

const runtimeConfig = vi.hoisted(() => ({ apiKey: 'test-api-key', apiToken: '', baseUrl: '', timeout: 0 }))

vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(() => ({
    lettermint: {
      apiKey: runtimeConfig.apiKey,
      apiToken: runtimeConfig.apiToken,
      baseUrl: runtimeConfig.baseUrl,
      timeout: runtimeConfig.timeout,
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

// Stands in for the Lettermint API: nothing in this file reaches the network.
function mockFetch(delayFor: (body: any) => number = () => 0) { // eslint-disable-line @typescript-eslint/no-explicit-any
  return vi.fn(async (url: string, init: RequestInit) => {
    const sent = JSON.parse(String(init.body))

    requests.push({
      url: String(url),
      headers: (init.headers || {}) as Record<string, string>,
      body: sent,
    })

    const delayMs = delayFor(sent)
    if (delayMs) await new Promise(resolve => setTimeout(resolve, delayMs))

    // The batch endpoint answers with one result per message.
    const body = String(url).endsWith('/send/batch')
      ? sent.map((_: unknown, index: number) => ({ message_id: `msg_${index}`, status: 'pending' }))
      : { message_id: sent.subject === base.subject ? 'msg_1' : `msg_${sent.subject}`, status: 'pending' }

    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
  })
}

async function send(options: SendEmailOptions) {
  const { sendEmail } = await import('../src/runtime/server/utils/lettermint')
  return sendEmail(options)
}

async function sendMany(messages: Array<Omit<SendEmailOptions, 'idempotencyKey'> & { idempotencyKey?: never }>, options?: { idempotencyKey?: string }) {
  const { sendEmails } = await import('../src/runtime/server/utils/lettermint')
  return sendEmails(messages, options)
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
  runtimeConfig.apiToken = ''
  runtimeConfig.baseUrl = ''
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

  it('sends a plain label through the tag field', async () => {
    await send({ ...base, tag: 'campaign-123' })

    expect(requests[0]!.body.tag).toBe('campaign-123')
    expect(requests[0]!.body.tags).toBeUndefined()
  })

  it('sends every key/value tag, alongside a plain label', async () => {
    await send({
      ...base,
      tag: 'campaign-123',
      tags: [{ name: 'campaign', value: '123' }, { name: 'cohort', value: 'beta' }],
    })

    expect(requests[0]!.body.tag).toBe('campaign-123')
    expect(requests[0]!.body.tags).toEqual([
      { name: 'campaign', value: '123' },
      { name: 'cohort', value: 'beta' },
    ])
  })

  it('refuses v1-style string entries in tags instead of dropping them', async () => {
    await expect(send({ ...base, tags: ['campaign-123'] as unknown as LettermintTag[] }))
      .rejects.toThrow('Tag 0 must be a { name, value } pair of strings. For a plain label, use the "tag" option.')

    expect(requests).toHaveLength(0)
  })

  it('refuses a message without text or html', async () => {
    await expect(send({ from: base.from, to: base.to, subject: base.subject }))
      .rejects.toThrow('Either text or html content is required')

    expect(requests).toHaveLength(0)
  })

  it('maps settings onto the payload', async () => {
    await send({
      ...base,
      settings: { trackOpens: true, trackClicks: false, tls: 'enforced' },
    })

    expect(requests[0]!.body.settings).toEqual({
      track_opens: true,
      track_clicks: false,
      tls: 'enforced',
    })
  })

  it('omits settings that were not set', async () => {
    await send({ ...base, settings: { trackOpens: true } })

    expect(requests[0]!.body.settings).toEqual({ track_opens: true })
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

  it('sends metadata values as strings', async () => {
    await send({
      ...base,
      metadata: { orderId: 42, priority: true, note: 'rush', dropped: null },
    })

    expect(requests[0]!.body.metadata).toEqual({
      orderId: '42',
      priority: 'true',
      note: 'rush',
    })
  })

  it('refuses metadata that cannot be represented as a string', async () => {
    await expect(send({ ...base, metadata: { order: { id: 42 } } as unknown as Record<string, string> }))
      .rejects.toThrow('Metadata value for "order" must be a string, number or boolean, received an object.')
    await expect(send({ ...base, metadata: { cb: () => 'secret' } as unknown as Record<string, string> }))
      .rejects.toThrow('Metadata value for "cb" must be a string, number or boolean, received a function.')

    expect(requests).toHaveLength(0)
  })

  it('restores a Buffer that was JSON-serialized through the endpoint', async () => {
    const buffer = Buffer.from('png')

    await send({
      ...base,
      attachments: [{ filename: 'logo.png', content: JSON.parse(JSON.stringify(buffer)) }],
    })

    expect(requests[0]!.body.attachments).toEqual([
      { filename: 'logo.png', content: buffer.toString('base64') },
    ])
  })

  it('refuses attachment content that is neither a string nor a Buffer', async () => {
    await expect(send({
      ...base,
      attachments: [{ filename: 'a.pdf', content: { anything: true } as unknown as string }],
    })).rejects.toThrow('Attachment content for "a.pdf" must be a base64 string or a Buffer.')

    expect(requests).toHaveLength(0)
  })

  it('sends the idempotency key as a header', async () => {
    await send({ ...base, idempotencyKey: 'order-42' })

    expect(requests[0]!.headers['Idempotency-Key']).toBe('order-42')
  })

  it('passes a scheduled delivery time through', async () => {
    await send({ ...base, scheduledAt: '2026-09-01T09:00:00.000Z' })

    expect(requests[0]!.body.scheduled_at).toBe('2026-09-01T09:00:00.000Z')
  })

  it('converts a Date scheduled delivery time to an ISO string', async () => {
    await send({ ...base, scheduledAt: new Date('2026-09-01T09:00:00Z') })

    expect(requests[0]!.body.scheduled_at).toBe('2026-09-01T09:00:00.000Z')
  })

  it.each(['tomorrow-ish', '2026-09-01T09:00', '0'])('refuses the scheduled delivery time "%s"', async (scheduledAt) => {
    await expect(send({ ...base, scheduledAt }))
      .rejects.toThrow(`scheduledAt must be a Date or an ISO 8601 string with a timezone, such as "2026-09-01T09:00:00Z", received "${scheduledAt}".`)

    expect(requests).toHaveLength(0)
  })

  it('accepts a scheduled delivery time with an offset timezone', async () => {
    await send({ ...base, scheduledAt: '2026-09-01T09:00:00+02:00' })

    expect(requests[0]!.body.scheduled_at).toBe('2026-09-01T07:00:00.000Z')
  })

  it('authenticates with the configured api key', async () => {
    await send(base)

    expect(requests[0]!.headers['x-lettermint-token']).toBe('test-api-key')
    expect(requests[0]!.url).toBe('https://api.lettermint.co/v1/send')
  })

  it('keeps concurrent sends isolated from each other', async () => {
    // The first send is answered last, so both are in flight at once.
    vi.stubGlobal('fetch', mockFetch(body => body.subject === 'First' ? 30 : 0))
    const { sendEmail } = await import('../src/runtime/server/utils/lettermint')

    const results = await Promise.all([
      sendEmail({
        ...base,
        to: 'one@acme.com',
        cc: 'cc@acme.com',
        subject: 'First',
        tag: 'first',
        attachments: [{ filename: 'one.txt', content: 'b25l' }],
        idempotencyKey: 'key-first',
      }),
      sendEmail({
        ...base,
        to: ['two@acme.com', 'three@acme.com'],
        subject: 'Second',
        html: '<p>Second</p>',
        tags: [{ name: 'order', value: 'second' }],
        idempotencyKey: 'key-second',
      }),
    ])

    expect(results.map(result => result.message_id)).toEqual(['msg_First', 'msg_Second'])
    expect(requests).toHaveLength(2)

    const bySubject = Object.fromEntries(requests.map(request => [request.body.subject, request]))

    expect(bySubject.First!.headers['Idempotency-Key']).toBe('key-first')
    expect(bySubject.First!.body).toEqual({
      from: base.from,
      to: ['one@acme.com'],
      cc: ['cc@acme.com'],
      subject: 'First',
      text: 'Hi',
      tag: 'first',
      attachments: [{ filename: 'one.txt', content: 'b25l' }],
    })
    expect(bySubject.Second!.headers['Idempotency-Key']).toBe('key-second')
    expect(bySubject.Second!.body).toEqual({
      from: base.from,
      to: ['two@acme.com', 'three@acme.com'],
      subject: 'Second',
      text: 'Hi',
      html: '<p>Second</p>',
      tags: [{ name: 'order', value: 'second' }],
    })
  })

  it('does not carry an idempotency key over to the next send', async () => {
    const { sendEmail } = await import('../src/runtime/server/utils/lettermint')

    await sendEmail({ ...base, idempotencyKey: 'order-42' })
    await sendEmail(base)

    expect(requests[0]!.headers['Idempotency-Key']).toBe('order-42')
    expect(requests[1]!.headers['Idempotency-Key']).toBeUndefined()
  })

  it('refuses tags the SDK rejects, as a payload error and before any request', async () => {
    const sending = send({ ...base, tags: [{ name: 'has spaces', value: 'x' }] })
    // After send(): vi.resetModules() hands each test a fresh copy of the module.
    const { LettermintPayloadError } = await import('../src/runtime/server/utils/errors')

    await expect(sending).rejects.toBeInstanceOf(LettermintPayloadError)
    await expect(sending).rejects.toThrow('tags: Message tag names must match')
    expect(requests).toHaveLength(0)
  })
})

describe('sendEmail configuration errors', () => {
  it('throws a helpful error when no api key is configured', async () => {
    runtimeConfig.apiKey = ''

    await expect(send(base)).rejects.toThrow('Lettermint API key is not configured')
  })

  it('treats a key of only whitespace as missing', async () => {
    runtimeConfig.apiKey = ' \n'

    await expect(send(base)).rejects.toThrow('Lettermint API key is not configured')
  })

  it('strips whitespace around the key, as fetch did for SDK 2', async () => {
    runtimeConfig.apiKey = 'test-api-key\n'

    await send(base)

    expect(requests[0]!.headers['x-lettermint-token']).toBe('test-api-key')
  })
})

describe('sendEmails', () => {
  it('posts every message to the batch endpoint in order', async () => {
    const result = await sendMany([
      { ...base, to: 'one@acme.com', subject: 'First' },
      { ...base, to: ['two@acme.com', 'three@acme.com'], subject: 'Second' },
    ])

    expect(requests).toHaveLength(1)
    expect(requests[0]!.url).toBe('https://api.lettermint.co/v1/send/batch')
    expect(requests[0]!.body).toEqual([
      { from: base.from, to: ['one@acme.com'], subject: 'First', text: 'Hi' },
      { from: base.from, to: ['two@acme.com', 'three@acme.com'], subject: 'Second', text: 'Hi' },
    ])
    expect(result).toEqual([
      { message_id: 'msg_0', status: 'pending' },
      { message_id: 'msg_1', status: 'pending' },
    ])
  })

  it('applies the same option mapping as a single send', async () => {
    await sendMany([{
      ...base,
      cc: 'cc@acme.com',
      tags: [{ name: 'campaign', value: '123' }],
      settings: { trackClicks: true },
      attachments: [{ filename: 'a.txt', content: 'YQ==', contentType: 'text/plain' }],
    }])

    expect(requests[0]!.body[0]).toMatchObject({
      cc: ['cc@acme.com'],
      tags: [{ name: 'campaign', value: '123' }],
      settings: { track_clicks: true },
      attachments: [{ filename: 'a.txt', content: 'YQ==', content_type: 'text/plain' }],
    })
  })

  it('applies the metadata mapping per message', async () => {
    await sendMany([{ ...base, metadata: { orderId: 42 } }])

    expect(requests[0]!.body[0].metadata).toEqual({ orderId: '42' })
  })

  it('schedules each message on its own time', async () => {
    await sendMany([
      { ...base, scheduledAt: new Date('2026-09-01T09:00:00Z') },
      base,
    ])

    expect(requests[0]!.body[0].scheduled_at).toBe('2026-09-01T09:00:00.000Z')
    expect(requests[0]!.body[1].scheduled_at).toBeUndefined()
  })

  it('sends the idempotency key as a header', async () => {
    await sendMany([base], { idempotencyKey: 'batch-1' })

    expect(requests[0]!.headers['Idempotency-Key']).toBe('batch-1')
  })

  it('names the message whose tags the SDK refuses', async () => {
    await expect(sendMany([base, { ...base, tags: [{ name: '__lettermint_x', value: 'x' }] }]))
      .rejects.toThrow('messages[1].tags: Message tag names must not start with __lettermint.')

    expect(requests).toHaveLength(0)
  })

  it('refuses a per-message idempotency key instead of dropping it', async () => {
    await expect(sendMany([base, { ...base, idempotencyKey: 'order-42' } as typeof base]))
      .rejects.toThrow('Message 1 carries an idempotencyKey, but the API applies idempotency to the batch as a whole.')

    expect(requests).toHaveLength(0)
  })
})

describe('client configuration', () => {
  it('uses a configured base url', async () => {
    runtimeConfig.baseUrl = 'https://mail.internal.acme.com/v1'

    await send(base)

    expect(requests[0]!.url).toBe('https://mail.internal.acme.com/v1/send')
  })
})

describe('useLettermint', () => {
  it('hands out an email builder of its own for each send', async () => {
    const { useLettermintEmail } = await import('../src/runtime/server/utils/lettermint')

    expect(useLettermintEmail()).not.toBe(useLettermintEmail())
  })

  it('hands out an immutable builder, so a shared base cannot leak between sends', async () => {
    const { useLettermintEmail } = await import('../src/runtime/server/utils/lettermint')
    const welcome = useLettermintEmail().from(base.from).subject('Welcome').text('Hi')

    await Promise.all([
      welcome.to('one@acme.com').send({ idempotencyKey: 'welcome-one' }),
      welcome.to('two@acme.com').tag('second').send(),
    ])

    expect(welcome.build()).toEqual({ from: base.from, to: [], subject: 'Welcome', text: 'Hi' })
    expect(requests.map(request => [request.body.to, request.body.tag, request.headers['Idempotency-Key']])).toEqual([
      [['one@acme.com'], undefined, 'welcome-one'],
      [['two@acme.com'], 'second', undefined],
    ])
  })

  it('reads the configuration on every call', async () => {
    const { useLettermint } = await import('../src/runtime/server/utils/lettermint')

    expect(useLettermint()).not.toBe(useLettermint())
  })

  it('sends with the sending key and reaches the team API with the team token', async () => {
    runtimeConfig.apiToken = 'test-api-token'
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      requests.push({ url: String(url), headers: init.headers as Record<string, string>, body: init.body && JSON.parse(String(init.body)) })
      return new Response(JSON.stringify({ message_id: 'msg_1', status: 'pending' }), { status: 200 })
    }))
    const { useLettermint } = await import('../src/runtime/server/utils/lettermint')
    const lettermint = useLettermint()

    await lettermint.emails.send({ from: base.from, to: [base.to], subject: base.subject, text: base.text })
    await lettermint.team.retrieve()

    expect(requests[0]!.headers['x-lettermint-token']).toBe('test-api-key')
    expect(requests[0]!.headers.Authorization).toBeUndefined()
    expect(requests[1]!.headers.Authorization).toBe('Bearer test-api-token')
    expect(requests[1]!.headers['x-lettermint-token']).toBeUndefined()
  })
})
