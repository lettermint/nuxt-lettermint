import { fileURLToPath } from 'node:url'
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils/e2e'
import { startMockLettermint } from './utils/mock-lettermint'

const lettermint = await startMockLettermint()

process.env.NUXT_LETTERMINT_API_KEY = 'test-api-key'
process.env.NUXT_LETTERMINT_BASE_URL = lettermint.baseUrl
process.env.NUXT_LETTERMINT_TIMEOUT = '300'

afterAll(() => lettermint.close())

const message = {
  from: 'nuxt@lettermint.dev',
  to: 'ok@testing.lettermint.co',
  subject: 'Test Email',
  html: '<h1>Test</h1>',
}

describe('/api/lettermint/send', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/with-endpoint', import.meta.url)),
    server: true,
  })

  beforeEach(() => {
    lettermint.requests.length = 0
  })

  async function post(body: Record<string, unknown>) {
    const response = await fetch('/api/lettermint/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    return { status: response.status, body: await response.json() }
  }

  it('sends the message and returns the message id', async () => {
    const response = await post(message)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ success: true, messageId: 'msg_mock', status: 'pending' })
    expect(lettermint.requests).toHaveLength(1)
    expect(lettermint.requests[0]).toMatchObject({
      method: 'POST',
      path: '/v1/send',
      token: 'test-api-key',
      body: { from: message.from, to: [message.to], subject: message.subject, html: message.html },
    })
  })

  it('passes every recipient of an array', async () => {
    await post({ ...message, to: ['one@acme.com', 'two@acme.com'], cc: 'cc@acme.com' })

    expect(lettermint.requests[0]!.body).toMatchObject({
      to: ['one@acme.com', 'two@acme.com'],
      cc: ['cc@acme.com'],
    })
  })

  it.each([
    ['from', { to: message.to, subject: message.subject, text: 'Test' }],
    ['to', { from: message.from, subject: message.subject, text: 'Test' }],
    ['subject', { from: message.from, to: message.to, text: 'Test' }],
  ])('rejects a body without %s', async (field, body) => {
    const response = await post(body)

    expect(response.status).toBe(400)
    expect(response.body.statusMessage).toBe(`Missing required field: ${field}`)
    expect(lettermint.requests).toHaveLength(0)
  })

  it('rejects a body without text or html', async () => {
    const response = await post({ from: message.from, to: message.to, subject: message.subject })

    expect(response.status).toBe(400)
    expect(response.body.statusMessage).toBe('Either text or html content is required')
    expect(lettermint.requests).toHaveLength(0)
  })

  it('answers 400 for metadata the payload mapping refuses', async () => {
    const response = await post({ ...message, metadata: { user: { id: 1 } } })

    expect(response.status).toBe(400)
    expect(response.body.statusMessage).toContain('Metadata value for "user"')
    expect(lettermint.requests).toHaveLength(0)
  })

  it('surfaces the reason the API rejected a message', async () => {
    lettermint.respondOnceWith({ status: 422, body: { message: 'Sending domain is not verified' } })

    const response = await post(message)

    expect(response.status).toBe(422)
    expect(response.body.statusMessage).toBe('Sending domain is not verified')
  })

  it('answers 400 when the API rejects the request', async () => {
    lettermint.respondOnceWith({ status: 400, body: { error: 'Unknown route' } })

    const response = await post(message)

    expect(response.status).toBe(400)
    expect(response.body.statusMessage).toBe('Unknown route')
  })

  it('passes an upstream server error through', async () => {
    lettermint.respondOnceWith({ status: 503, body: {} })

    const response = await post(message)

    expect(response.status).toBe(503)
  })

  it('answers 504 when the API does not respond in time', async () => {
    lettermint.respondOnceWith({ status: 200, body: {}, delayMs: 900 })

    const response = await post(message)

    expect(response.status).toBe(504)
    expect(response.body.statusMessage).toContain('timeout')
  })

  it('surfaces an error reported under the error key', async () => {
    lettermint.respondOnceWith({ status: 422, body: { error: 'ValidationError' } })

    const response = await post(message)

    expect(response.status).toBe(422)
    expect(response.body.statusMessage).toBe('ValidationError')
  })
})
