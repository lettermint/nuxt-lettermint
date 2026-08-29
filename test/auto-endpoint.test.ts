import { fileURLToPath } from 'node:url'
import { describe, it, expect, afterAll } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils/e2e'
import { startMockLettermint } from './utils/mock-lettermint'

const lettermint = await startMockLettermint()

process.env.NUXT_LETTERMINT_API_KEY = 'test-api-key'
process.env.NUXT_LETTERMINT_BASE_URL = lettermint.baseUrl

afterAll(() => lettermint.close())

const message = {
  from: 'nuxt@lettermint.dev',
  to: 'ok@testing.lettermint.co',
  subject: 'Custom endpoint',
  text: 'Sent through a custom endpoint',
}

describe('without autoEndpoint', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/without-endpoint', import.meta.url)),
    server: true,
  })

  it('does not register /api/lettermint/send by default', async () => {
    const response = await fetch('/api/lettermint/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })

    // No handler is registered, so the request falls through to the app itself.
    expect(response.headers.get('content-type')).toContain('text/html')
    expect(lettermint.requests).toHaveLength(0)
  })

  it('tells the composable the endpoint is off through public config', async () => {
    const page = await (await fetch('/')).text()

    expect(page).toContain('auto-endpoint: false')
    expect(page).not.toContain('test-api-key')
  })

  it('still lets a custom endpoint send through sendEmail', async () => {
    const response = await fetch('/api/custom-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ message_id: 'msg_mock', status: 'pending' })
    expect(lettermint.requests[0]!.body).toMatchObject({
      to: [message.to],
      subject: message.subject,
    })
  })
})
