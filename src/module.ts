import { defineNuxtModule, addPlugin, createResolver, addServerHandler, addImportsDir, addServerImportsDir } from '@nuxt/kit'
import { defu } from 'defu'

export interface ModuleOptions {
  apiKey?: string
  /** Team API token. Separate from the sending key, and server-side only. */
  apiToken?: string
  baseUrl?: string
  timeout?: number
  /**
   * Register /api/lettermint/send. The route has no authentication of its own,
   * so it is off unless you opt in and guard it.
   */
  autoEndpoint?: boolean
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-lettermint',
    configKey: 'lettermint',
    compatibility: {
      nuxt: '>=3.0.0',
    },
  },
  defaults: {
    autoEndpoint: false,
  },
  setup: function (options, nuxt) {
    const resolver = createResolver(import.meta.url)

    const runtimeConfig = {
      apiKey: options.apiKey || process.env.NUXT_LETTERMINT_API_KEY || '',
      apiToken: options.apiToken || process.env.NUXT_LETTERMINT_API_TOKEN || '',
      baseUrl: options.baseUrl || process.env.NUXT_LETTERMINT_BASE_URL || '',
      timeout: options.timeout || Number(process.env.NUXT_LETTERMINT_TIMEOUT) || 0,
    }

    nuxt.options.runtimeConfig.lettermint = defu(
      nuxt.options.runtimeConfig.lettermint || {} as Record<string, unknown>,
      runtimeConfig,
    ) as typeof runtimeConfig

    nuxt.options.runtimeConfig.public.lettermint = defu(
      nuxt.options.runtimeConfig.public.lettermint || {} as Record<string, unknown>,
      { autoEndpoint: options.autoEndpoint === true },
    ) as { autoEndpoint: boolean }

    addServerImportsDir(resolver.resolve('./runtime/server/utils'))

    if (options.autoEndpoint === true) {
      addServerHandler({
        route: '/api/lettermint/send',
        handler: resolver.resolve('./runtime/server/api/lettermint/send.post'),
      })
    }

    addImportsDir(resolver.resolve('./runtime/composables'))

    addPlugin(resolver.resolve('./runtime/plugin'))
  },
})

// Module type augmentation
declare module '@nuxt/schema' {
  interface RuntimeConfig {
    lettermint: {
      apiKey: string
      apiToken: string
      baseUrl: string
      timeout: number
    }
  }
  interface PublicRuntimeConfig {
    lettermint: {
      autoEndpoint: boolean
    }
  }
}
