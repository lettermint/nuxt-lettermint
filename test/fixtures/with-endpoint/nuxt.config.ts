export default defineNuxtConfig({
  modules: ['../../../src/module'],
  lettermint: {
    apiKey: process.env.NUXT_LETTERMINT_API_KEY,
    autoEndpoint: true,
  },
})
