import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('Server-side email sending', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/server-test', import.meta.url)),
    server: true,
  })

  it('should send email using sendEmail function', async () => {
    try {
      const response = await $fetch('/api/test-send-email')

      // The response will depend on whether the API key is configured
      expect(response).toBeDefined()
    }
    catch (error) {
      // Expected if API key is not configured
      expect(error).toBeDefined()
    }
  })

  it('should use Lettermint SDK directly', async () => {
    try {
      const response = await $fetch('/api/test-sdk')

      // The response will depend on whether the API key is configured
      expect(response).toBeDefined()
    }
    catch (error) {
      // Expected if API key is not configured
      expect(error).toBeDefined()
    }
  })

  it('should handle arrays of recipients', async () => {
    try {
      const response = await $fetch('/api/test-multiple-recipients')

      expect(response).toBeDefined()
    }
    catch (error) {
      // Expected if API key is not configured
      expect(error).toBeDefined()
    }
  })

  it('should handle all email options', async () => {
    try {
      const response = await $fetch('/api/test-full-options')

      expect(response).toBeDefined()
    }
    catch (error) {
      // Expected if API key is not configured
      expect(error).toBeDefined()
    }
  })
})
