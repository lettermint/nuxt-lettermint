export default defineNuxtConfig({
  modules: ['../src/module'],
  devtools: { enabled: true },
  lettermint: {
    // API key can be set here or via NUXT_LETTERMINT_API_KEY env variable
    // apiKey: 'your-api-key-here'
  },
})
