import { defineNuxtModule, createResolver, addServerHandler, addImportsDir, addServerImportsDir } from '@nuxt/kit'
import { defu } from 'defu'
import type { LettermintModuleOptions } from './runtime/types'

// Server auto-imports carry values, not types, so the public types are reached
// through the package itself: import type { ... } from 'nuxt-lettermint'.
export type * from './runtime/types'

export type ModuleOptions = LettermintModuleOptions

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-lettermint',
    configKey: 'lettermint',
    compatibility: {
      nuxt: '>=4.0.0',
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
        method: 'post',
        handler: resolver.resolve('./runtime/server/api/lettermint/send.post'),
      })
    }

    addImportsDir(resolver.resolve('./runtime/composables'))
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
