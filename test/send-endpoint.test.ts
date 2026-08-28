import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HttpRequestError } from 'lettermint'
import { LettermintPayloadError } from '../src/runtime/server/utils/errors'

const sendEmail = vi.hoisted(() => vi.fn())
const body = vi.hoisted(() => ({ value: {} as Record<string, unknown> }))

vi.mock('../src/runtime/server/utils/lettermint', () => ({ sendEmail }))
vi.mock('h3', () => ({
  defineEventHandler: (handler: unknown) => handler,
  readBody: async () => body.value,
  createError: (options: { statusCode: number, message?: string, data?: unknown }) =>
    Object.assign(new Error(options.message), options),
}))

const message = { from: 'a@acme.com', to: 'b@acme.com', subject: 'Hi', text: 'Hello' }

async function post(payload: Record<string, unknown> = message) {
  body.value = payload
  const handler = (await import('../src/runtime/server/api/lettermint/send.post')).default as unknown as () => Promise<unknown>
  return handler()
}

beforeEach(() => {
  sendEmail.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

// The e2e suite covers the wire; this pins the catch chain's classification.
describe('send endpoint error classification', () => {
  it('answers 400 for input the payload mapping refused', async () => {
    sendEmail.mockRejectedValue(new LettermintPayloadError('scheduledAt must be a Date or an ISO 8601 string, received "x".'))

    await expect(post()).rejects.toMatchObject({
      statusCode: 400,
      message: 'scheduledAt must be a Date or an ISO 8601 string, received "x".',
    })
  })

  it.each([401, 403])('remaps an upstream %s to 502 without replaying the message', async (status) => {
    sendEmail.mockRejectedValue(new HttpRequestError(`HTTP error ${status}`, status, { message: 'Invalid token' }))

    await expect(post()).rejects.toMatchObject({
      statusCode: 502,
      message: 'The email service rejected the server credentials',
    })
    expect(console.error).toHaveBeenCalled()
  })

  it('answers 502 when the email service cannot be reached', async () => {
    sendEmail.mockRejectedValue(new TypeError('fetch failed'))

    await expect(post()).rejects.toMatchObject({
      statusCode: 502,
      message: 'Could not reach the email service',
    })
    expect(console.error).toHaveBeenCalled()
  })

  it('answers a generic 500 without leaking configuration detail', async () => {
    sendEmail.mockRejectedValue(new Error('Lettermint API key is not configured. Please set NUXT_LETTERMINT_API_KEY environment variable or configure it in nuxt.config.ts'))

    const thrown = (await post().catch(error => error)) as Error & { statusCode: number }

    expect(thrown).toMatchObject({ statusCode: 500, message: 'Internal server error while sending email' })
    expect(JSON.stringify({ ...thrown, message: thrown.message })).not.toContain('API key')
    expect(console.error).toHaveBeenCalled()
  })

  it('passes an upstream failure through with its status, message and detail', async () => {
    sendEmail.mockRejectedValue(new HttpRequestError('HTTP error 422', 422, {
      message: 'Validation failed',
      errors: { to: ['invalid address'] },
    }))

    await expect(post()).rejects.toMatchObject({
      statusCode: 422,
      message: 'Validation failed',
      data: { message: 'Validation failed', errors: { to: ['invalid address'] } },
    })
  })
})
