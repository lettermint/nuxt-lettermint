export default defineNuxtConfig({
  modules: ['../../../src/module'],
  lettermint: {
    // Use real API key from env if available, fallback to test key
    apiKey: process.env.NUXT_LETTERMINT_API_KEY || 'test-api-key',
  },
})
