export default defineNuxtConfig({
  modules: ['../../../src/module'],
  lettermint: {
    apiKey: process.env.NUXT_LETTERMINT_API_KEY || 'test-api-key',
    // autoEndpoint is off by default
  },
})
