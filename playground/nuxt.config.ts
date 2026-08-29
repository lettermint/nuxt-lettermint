export default defineNuxtConfig({
  modules: ['../src/module'],
  devtools: { enabled: true },
  lettermint: {
    // Sending key: NUXT_LETTERMINT_API_KEY env variable, or apiKey here.
    // Team API demos also need NUXT_LETTERMINT_API_TOKEN (or apiToken).

    // The client-side demo posts to /api/lettermint/send, so it needs the route
    autoEndpoint: true,
  },
})
