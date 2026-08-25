import { fileURLToPath } from 'node:url'
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'
import { startMockLettermint } from './utils/mock-lettermint'

const lettermint = await startMockLettermint()

process.env.NUXT_LETTERMINT_API_KEY = 'test-api-key'
process.env.NUXT_LETTERMINT_API_TOKEN = 'test-api-token'
process.env.NUXT_LETTERMINT_BASE_URL = lettermint.baseUrl

afterAll(() => lettermint.close())

interface FixtureResult {
  success: boolean
  error?: string
  ping?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  team?: any
}

describe('server utilities', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/server-test', import.meta.url)),
    server: true,
  })

  beforeEach(() => {
    lettermint.requests.length = 0
  })

  it('sends an email with sendEmail', async () => {
    const response = await $fetch<FixtureResult>('/api/test-send-email')

    expect(response.error).toBeUndefined()
    expect(response.result).toEqual({ message_id: 'msg_mock', status: 'pending' })
    expect(lettermint.requests[0]!.body).toMatchObject({
      from: 'nuxt@lettermint.dev',
      to: ['ok@testing.lettermint.co'],
      subject: 'Test Email',
      tag: 'test',
    })
  })

  it('keeps every address of an array of recipients', async () => {
    const response = await $fetch<FixtureResult>('/api/test-multiple-recipients')

    expect(response.error).toBeUndefined()
    expect(lettermint.requests[0]!.body).toMatchObject({
      to: ['ok@testing.lettermint.co', 'softbounce@testing.lettermint.co'],
      cc: ['ok@testing.lettermint.co', 'softbounce@testing.lettermint.co'],
      bcc: ['ok@testing.lettermint.co'],
    })
  })

  it('maps every supported option onto the payload', async () => {
    const response = await $fetch<FixtureResult>('/api/test-full-options')

    expect(response.error).toBeUndefined()
    expect(lettermint.requests[0]!.body).toMatchObject({
      reply_to: ['ok@testing.lettermint.co'],
      text: 'Plain text version',
      html: '<h1>HTML version</h1>',
      headers: { 'X-Custom-Header': 'custom-value' },
      metadata: { userId: '12345', campaign: 'test-campaign' },
      tag: 'test',
      attachments: [{ filename: 'test.txt', content: 'Test attachment content' }],
    })
  })

  it('sends a batch in one request', async () => {
    const response = await $fetch<FixtureResult>('/api/test-batch')

    expect(response.error).toBeUndefined()
    expect(lettermint.requests).toHaveLength(1)
    expect(lettermint.requests[0]!.path).toBe('/v1/send/batch')
    expect(lettermint.requests[0]!.body).toMatchObject([
      { to: ['first@testing.lettermint.co'], subject: 'First' },
      { to: ['second@testing.lettermint.co', 'third@testing.lettermint.co'], subject: 'Second' },
    ])
  })

  it('sends through a builder of its own', async () => {
    const response = await $fetch<FixtureResult>('/api/test-builder')

    expect(response.error).toBeUndefined()
    expect(lettermint.requests[0]!.body).toMatchObject({
      subject: 'Test Builder',
      to: ['ok@testing.lettermint.co'],
    })
  })

  it('reaches the team API with its own token', async () => {
    const response = await $fetch<FixtureResult>('/api/test-api-client')

    expect(response.error).toBeUndefined()
    expect(response.ping).toBe('pong')
    expect(lettermint.requests[0]).toMatchObject({
      method: 'GET',
      path: '/v1/team',
      authorization: 'Bearer test-api-token',
    })
    expect(lettermint.requests[0]!.token).toBeUndefined()
  })

  it('hands back errors as the classes it documents', async () => {
    lettermint.respondOnceWith({ status: 422, body: { error: 'Sender domain is not verified' } })

    const response = await $fetch<{
      threw: boolean
      recognised: boolean
      isValidationError: boolean
      failure: { statusCode: number, message: string }
    }>('/api/test-error-classes')

    expect(response).toEqual({
      threw: true,
      recognised: true,
      isValidationError: true,
      failure: { statusCode: 422, message: 'Sender domain is not verified' },
    })
  })

  it('exposes the SDK builder through useLettermint', async () => {
    const response = await $fetch<FixtureResult>('/api/test-sdk')

    expect(response.error).toBeUndefined()
    expect(lettermint.requests[0]!.body).toMatchObject({
      subject: 'Test SDK Email',
      tag: 'sdk-test',
    })
  })
})
