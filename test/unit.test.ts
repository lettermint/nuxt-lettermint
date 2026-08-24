import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

const post = vi.hoisted(() => vi.fn())

vi.mock('ofetch', () => ({ $fetch: post }))
vi.mock('#imports', () => ({ ref }))

const message = {
  from: 'hello@acme.com',
  to: 'user@acme.com',
  subject: 'Hello',
  text: 'Hi',
}

async function useLettermint() {
  const composable = await import('../src/runtime/composables/useLettermint')
  return composable.useLettermint()
}

beforeEach(() => {
  post.mockReset()
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
    ])
  })
})
