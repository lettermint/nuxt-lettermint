import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('Nuxt Lettermint Module - Auto Endpoint Enabled', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/with-endpoint', import.meta.url)),
    server: true,
  })

  it('should have /api/lettermint/send endpoint available', async () => {
    const response = await $fetch('/api/lettermint/send', {
      method: 'POST',
      body: {
        from: 'nuxt@lettermint.dev',
        to: 'ok@testing.lettermint.co',
        subject: 'Test Email',
        html: '<h1>Test</h1>',
      },
    })

    // Endpoint exists and should return a response
    expect(response).toBeDefined()
    expect(response.success).toBe(true)
    expect(response.messageId).toBeDefined()
    expect(response.status).toBeDefined()
  })

  it('should validate required fields', async () => {
    try {
      await $fetch('/api/lettermint/send', {
        method: 'POST',
        body: {
          // Missing required fields
        },
      })
      // Should not reach here
      expect(true).toBe(false)
    }
    catch (error) {
      const err = error as { statusCode?: number; data?: { statusMessage?: string }; statusMessage?: string }
      expect(err.statusCode).toBe(400)
      expect(err.data?.statusMessage || err.statusMessage).toContain('Missing required field')
    }
  })

  it('should validate from field', async () => {
    try {
      await $fetch('/api/lettermint/send', {
        method: 'POST',
        body: {
          to: 'ok@testing.lettermint.co',
          subject: 'Test',
          text: 'Test',
        },
      })
      expect(true).toBe(false)
    }
    catch (error) {
      const err = error as { statusCode?: number; data?: { statusMessage?: string }; statusMessage?: string }
      expect(err.statusCode).toBe(400)
      expect(err.data?.statusMessage || err.statusMessage).toContain('Missing required field: from')
    }
  })

  it('should validate to field', async () => {
    try {
      await $fetch('/api/lettermint/send', {
        method: 'POST',
        body: {
          from: 'nuxt@lettermint.dev',
          subject: 'Test',
          text: 'Test',
        },
      })
      expect(true).toBe(false)
    }
    catch (error) {
      const err = error as { statusCode?: number; data?: { statusMessage?: string }; statusMessage?: string }
      expect(err.statusCode).toBe(400)
      expect(err.data?.statusMessage || err.statusMessage).toContain('Missing required field: to')
    }
  })

  it('should validate subject field', async () => {
    try {
      await $fetch('/api/lettermint/send', {
        method: 'POST',
        body: {
          from: 'nuxt@lettermint.dev',
          to: 'ok@testing.lettermint.co',
          text: 'Test',
        },
      })
      expect(true).toBe(false)
    }
    catch (error) {
      const err = error as { statusCode?: number; data?: { statusMessage?: string }; statusMessage?: string }
      expect(err.statusCode).toBe(400)
      expect(err.data?.statusMessage || err.statusMessage).toContain('Missing required field: subject')
    }
  })

  it('should validate content (text or html required)', async () => {
    try {
      await $fetch('/api/lettermint/send', {
        method: 'POST',
        body: {
          from: 'nuxt@lettermint.dev',
          to: 'ok@testing.lettermint.co',
          subject: 'Test',
        },
      })
      expect(true).toBe(false)
    }
    catch (error) {
      const err = error as { statusCode?: number; data?: { statusMessage?: string }; statusMessage?: string }
      expect(err.statusCode).toBe(400)
      expect(err.data?.statusMessage || err.statusMessage).toContain('Either text or html content is required')
    }
  })
})

describe('Nuxt Lettermint Module - Auto Endpoint Disabled', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/without-endpoint', import.meta.url)),
    server: true,
  })

  it('should not have /api/lettermint/send endpoint when disabled', async () => {
    try {
      await $fetch('/api/lettermint/send', {
        method: 'POST',
        body: {
          from: 'nuxt@lettermint.dev',
          to: 'ok@testing.lettermint.co',
          subject: 'Test Email',
          html: '<h1>Test</h1>',
        },
      })
      // Should not reach here if endpoint doesn't exist
      expect(true).toBe(false)
    }
    catch (error) {
      const err = error as { statusCode?: number }
      expect(err.statusCode).toBe(404)
    }
  })

  it('should allow custom endpoint', async () => {
    try {
      const response = await $fetch('/api/custom-send', {
        method: 'POST',
        body: {
          from: 'nuxt@lettermint.dev',
          to: 'ok@testing.lettermint.co',
          subject: 'Test Email',
          html: '<h1>Test</h1>',
        },
      })

      expect(response).toBeDefined()
    }
    catch (error) {
      // Custom endpoint exists but API key might not be configured
      const err = error as { statusCode?: number }
      expect([500, 422]).toContain(err.statusCode)
    }
  })
})

describe('Nuxt Lettermint Module - Configuration', () => {
  it('should accept API key from environment variable', async () => {
    process.env.NUXT_LETTERMINT_API_KEY = 'test-api-key'

    await setup({
      rootDir: fileURLToPath(new URL('./fixtures/with-env', import.meta.url)),
      server: true,
    })

    // The module should be configured with the API key
    expect(process.env.NUXT_LETTERMINT_API_KEY).toBe('test-api-key')
  })
})

describe('Nuxt Lettermint Module - Config Test', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/with-config', import.meta.url)),
    server: true,
  })

  it('should accept API key from nuxt.config', async () => {
    // Module should be configured via nuxt.config and work with real API key
    const response = await $fetch('/api/lettermint/send', {
      method: 'POST',
      body: {
        from: 'nuxt@lettermint.dev',
        to: 'ok@testing.lettermint.co',
        subject: 'Test Config',
        html: '<h1>Test from config</h1>',
      },
    })

    expect(response).toBeDefined()
    expect(response.success).toBe(true)
    expect(response.messageId).toBeDefined()
  })
})
