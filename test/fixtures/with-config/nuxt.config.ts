export default defineNuxtConfig({
  modules: ['../../../src/module'],
  lettermint: {
    // Use real API key from env
    apiKey: process.env.NUXT_LETTERMINT_API_KEY,
    autoEndpoint: true,
  },
})
