export default defineNuxtConfig({
  modules: ['../../../src/module'],
  lettermint: {
    // Auto endpoint is enabled by default
    // Use real API key from env
    apiKey: process.env.NUXT_LETTERMINT_API_KEY,
  },
})
