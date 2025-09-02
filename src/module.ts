import { defineNuxtModule, addPlugin, createResolver, addServerHandler, addImportsDir, addServerImportsDir } from '@nuxt/kit'
import { defu } from 'defu'

export interface ModuleOptions {
  apiKey?: string
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-lettermint',
    configKey: 'lettermint',
    compatibility: {
      nuxt: '>=3.0.0',
    },
  },
  defaults: {},
  setup: function (options, nuxt) {
    const resolver = createResolver(import.meta.url)

    const runtimeConfig = {
      apiKey: options.apiKey || process.env.NUXT_LETTERMINT_API_KEY || '',
    }

    nuxt.options.runtimeConfig.lettermint = defu(
      nuxt.options.runtimeConfig.lettermint || {} as Record<string, unknown>,
      runtimeConfig,
    ) as typeof runtimeConfig

    addServerImportsDir(resolver.resolve('./runtime/server/utils'))

    addServerHandler({
      route: '/api/lettermint/send',
      handler: resolver.resolve('./runtime/server/api/lettermint/send.post'),
    })

    addImportsDir(resolver.resolve('./runtime/composables'))

    addPlugin(resolver.resolve('./runtime/plugin'))
  },
})

// Module type augmentation
declare module '@nuxt/schema' {
  interface RuntimeConfig {
    lettermint: {
      apiKey: string
    }
  }
  interface PublicRuntimeConfig {
    lettermint?: Record<string, never>
  }
}
