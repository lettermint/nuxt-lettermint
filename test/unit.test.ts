import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

const post = vi.hoisted(() => vi.fn())
const publicConfig = vi.hoisted(() => ({ autoEndpoint: true }))

vi.mock('ofetch', () => ({ $fetch: post }))
vi.mock('#imports', () => ({
  ref,
  useRuntimeConfig: () => ({ public: { lettermint: publicConfig } }),
}))

const message = {
  from: 'hello@acme.com',
  to: 'user@acme.com',
  subject: 'Hello',
  text: 'Hi',
}

async function useLettermint(options?: { endpoint?: string }) {
  const composable = await import('../src/runtime/composables/useLettermint')
  return composable.useLettermint(options)
}

beforeEach(() => {
  post.mockReset()
  publicConfig.autoEndpoint = true
})

describe('useLettermint composable', () => {
  it('posts the message to the module endpoint', async () => {
    post.mockResolvedValue({ success: true, messageId: 'msg_1', status: 'pending' })
    const { send } = await useLettermint()

    const response = await send(message)

    expect(post).toHaveBeenCalledWith('/api/lettermint/send', { method: 'POST', body: message })
    expect(response).toEqual({ success: true, messageId: 'msg_1', status: 'pending' })
  })

  it('tracks the last message id', async () => {
    post.mockResolvedValue({ success: true, messageId: 'msg_2' })
    const { send, lastMessageId } = await useLettermint()

    expect(lastMessageId.value).toBeNull()
    await send(message)

    expect(lastMessageId.value).toBe('msg_2')
  })

  it('flags sending while the request is in flight', async () => {
    let release: () => void = () => {}
    post.mockReturnValue(new Promise((resolve) => {
      release = () => resolve({ success: true, messageId: 'msg_3' })
    }))
    const { send, sending } = await useLettermint()

    const pending = send(message)
    expect(sending.value).toBe(true)

    release()
    await pending
    expect(sending.value).toBe(false)
  })

  it('surfaces the server error message', async () => {
    post.mockRejectedValue({ data: { statusMessage: 'Missing required field: from' } })
    const { send, error, sending } = await useLettermint()

    const response = await send(message)

    expect(response).toEqual({ success: false, error: 'Missing required field: from' })
    expect(error.value).toBe('Missing required field: from')
    expect(sending.value).toBe(false)
  })

  it('explains itself when no endpoint is registered', async () => {
    publicConfig.autoEndpoint = false
    const { send, error } = await useLettermint()

    const response = await send(message)

    expect(post).not.toHaveBeenCalled()
    expect(response.success).toBe(false)
    expect(response.error).toContain('autoEndpoint: true')
    expect(error.value).toBe(response.error)
  })

  it('posts to a custom endpoint when one is given', async () => {
    publicConfig.autoEndpoint = false
    post.mockResolvedValue({ success: true, messageId: 'msg_4' })
    const { send } = await useLettermint({ endpoint: '/api/contact' })

    await send(message)

    expect(post).toHaveBeenCalledWith('/api/contact', { method: 'POST', body: message })
  })

  it('treats an empty response from a custom endpoint as sent', async () => {
    post.mockResolvedValue(undefined)
    const { send, error } = await useLettermint({ endpoint: '/api/notify' })

    const response = await send(message)

    expect(response.success).toBe(true)
    expect(error.value).toBeNull()
  })

  it('refuses a page where JSON was expected', async () => {
    post.mockResolvedValue('<!DOCTYPE html><html><body>app</body></html>')
    const { send, error } = await useLettermint()

    const response = await send(message)

    expect(response.success).toBe(false)
    expect(response.error).toContain('answered with a page instead of JSON')
    expect(error.value).toBe(response.error)
  })

  it('mirrors a passed-through failure into the error ref', async () => {
    post.mockResolvedValue({ success: false, error: 'rate limited' })
    const { send, error } = await useLettermint()

    const response = await send(message)

    expect(response).toMatchObject({ success: false, error: 'rate limited' })
    expect(error.value).toBe('rate limited')
  })

  it('accepts the raw SDK result from a custom endpoint', async () => {
    post.mockResolvedValue({ message_id: 'msg_5', status: 'pending' })
    const { send, lastMessageId } = await useLettermint({ endpoint: '/api/contact' })

    const response = await send(message)

    expect(response.success).toBe(true)
    expect(response.messageId).toBe('msg_5')
    expect(lastMessageId.value).toBe('msg_5')
  })

  it('falls back to a generic message when the error carries none', async () => {
    post.mockRejectedValue({})
    const { send, error } = await useLettermint()

    await send(message)

    expect(error.value).toBe('Failed to send email')
  })
})

describe('server utilities', () => {
  it('exports the documented helpers', async () => {
    vi.doMock('#imports', () => ({ useRuntimeConfig: () => ({ lettermint: { apiKey: 'k' } }) }))
    const utils = await import('../src/runtime/server/utils/lettermint')

    expect(Object.keys(utils).sort()).toEqual([
      'sendEmail',
      'sendEmails',
      'useLettermint',
      'useLettermintApi',
      'useLettermintEmail',
    ])
  })
})
