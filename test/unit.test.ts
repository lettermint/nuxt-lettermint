import { describe, it, expect, vi } from 'vitest'

// Mock Vue's ref function
vi.mock('#imports', () => ({
  ref: vi.fn(value => ({ value })),
  useRuntimeConfig: vi.fn(() => ({
    lettermint: {
      apiKey: 'test-api-key',
    },
  })),
}))

describe('Client Composable', () => {
  it('should export useLettermint function', async () => {
    const { useLettermint } = await import('../src/runtime/composables/useLettermint')
    expect(typeof useLettermint).toBe('function')
  })

  it('should return correct interface', async () => {
    const { useLettermint } = await import('../src/runtime/composables/useLettermint')
    const composable = useLettermint()

    expect(composable).toHaveProperty('send')
    expect(composable).toHaveProperty('sending')
    expect(composable).toHaveProperty('error')
    expect(composable).toHaveProperty('lastMessageId')

    expect(typeof composable.send).toBe('function')
  })
})

describe('Server Utils', () => {
  it('should export sendEmail function', async () => {
    const { sendEmail } = await import('../src/runtime/server/utils/lettermint')
    expect(typeof sendEmail).toBe('function')
  })

  it('should export useLettermint function', async () => {
    const { useLettermint } = await import('../src/runtime/server/utils/lettermint')
    expect(typeof useLettermint).toBe('function')
  })
})

describe('Type Definitions', () => {
  it('should export email option interfaces', async () => {
    const types = await import('../src/runtime/types/index')
    expect(types).toBeDefined()
  })
})
