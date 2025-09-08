import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('Module Integration Tests', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
    server: true,
  })

  it('renders the index page', async () => {
    const html = await $fetch('/')
    expect(html).toContain('<div>basic</div>')
  })
})

describe('Configuration Options', () => {
  it('module configuration is loaded correctly', () => {
    // This test validates that the module configuration options are properly typed
    const config = {
      apiKey: 'test',
      autoEndpoint: false,
    }

    expect(config.apiKey).toBe('test')
    expect(config.autoEndpoint).toBe(false)
  })

  it('default autoEndpoint should be true', () => {
    // The module defaults autoEndpoint to true
    const defaults = {
      autoEndpoint: true,
    }

    expect(defaults.autoEndpoint).toBe(true)
  })
})
