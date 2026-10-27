import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ApiError,
  AuthenticationError,
  ConnectionError,
  LettermintConfigError,
  PermissionError,
  TimeoutError,
  UnexpectedResponseError,
  ValidationError,
} from 'lettermint'
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

  it.each([
    [401, AuthenticationError],
    [403, PermissionError],
  ])('remaps an upstream %s to 502 without replaying the message', async (status, ErrorClass) => {
    sendEmail.mockRejectedValue(new ErrorClass({ status, message: 'Invalid token', body: { message: 'Invalid token' } }))

    const thrown = (await post().catch(error => error)) as Error & { data?: unknown }

    expect(thrown).toMatchObject({
      statusCode: 502,
      message: 'The email service rejected the server credentials',
    })
    expect(thrown.data).toBeUndefined()
    expect(console.error).toHaveBeenCalled()
  })

  it.each(['fetch failed', 'terminated'])('answers 502 when the email service cannot be reached (%s)', async (reason) => {
    sendEmail.mockRejectedValue(new ConnectionError(new TypeError(reason)))

    await expect(post()).rejects.toMatchObject({
      statusCode: 502,
      message: 'Could not reach the email service',
      data: { cause: reason },
    })
    expect(console.error).toHaveBeenCalled()
  })

  it('answers 502 when the email service answers with something other than JSON', async () => {
    sendEmail.mockRejectedValue(new UnexpectedResponseError('The Lettermint API answered with HTTP 502 and a body that is not JSON (text/html).', 502, '<html>'))

    await expect(post()).rejects.toMatchObject({
      statusCode: 502,
      message: 'The email service answered with an invalid response',
    })
    expect(console.error).toHaveBeenCalled()
  })

  it('answers 504 when the email service does not answer in time', async () => {
    sendEmail.mockRejectedValue(new TimeoutError(300))

    await expect(post()).rejects.toMatchObject({
      statusCode: 504,
      message: 'The request to the Lettermint API timed out after 300 ms.',
    })
  })

  it('answers a generic 500 without leaking configuration detail', async () => {
    sendEmail.mockRejectedValue(new Error('Lettermint API key is not configured. Please set NUXT_LETTERMINT_API_KEY environment variable or configure it in nuxt.config.ts'))

    const thrown = (await post().catch(error => error)) as Error & { statusCode: number }

    expect(thrown).toMatchObject({ statusCode: 500, message: 'Internal server error while sending email' })
    expect(JSON.stringify({ ...thrown, message: thrown.message })).not.toContain('API key')
    expect(console.error).toHaveBeenCalled()
  })

  it('logs, but does not answer with, an SDK configuration error', async () => {
    sendEmail.mockRejectedValue(new LettermintConfigError('`sendingToken` contains whitespace or characters that are not allowed in an HTTP header.'))

    const thrown = (await post().catch(error => error)) as Error & { statusCode: number }

    expect(thrown).toMatchObject({ statusCode: 500, message: 'The email service is not configured correctly' })
    expect(JSON.stringify({ ...thrown, message: thrown.message })).not.toContain('sendingToken')
    expect(console.error).toHaveBeenCalled()
  })

  it('passes an upstream failure through with its status, message and detail', async () => {
    const detail = { message: 'Validation failed', errors: { to: ['invalid address'] } }
    sendEmail.mockRejectedValue(new ValidationError({ status: 422, message: 'Validation failed', body: detail, errors: detail.errors }))

    await expect(post()).rejects.toMatchObject({
      statusCode: 422,
      message: 'Validation failed',
      data: detail,
    })
    expect(console.error).not.toHaveBeenCalled()
  })

  it('passes any other API error status through', async () => {
    sendEmail.mockRejectedValue(new ApiError({ status: 413, message: 'Payload Too Large', body: { message: 'Attachments too large' } }))

    await expect(post()).rejects.toMatchObject({ statusCode: 413, message: 'Attachments too large' })
  })
})
