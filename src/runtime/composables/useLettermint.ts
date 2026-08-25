import { $fetch } from 'ofetch'
import type { Ref } from 'vue'
import { ref, useRuntimeConfig } from '#imports'
import type { LettermintApiResponse, LettermintEmailOptions } from '../types'

export type { LettermintEmailOptions } from '../types'

export type LettermintResponse = LettermintApiResponse

export interface UseLettermintOptions {
  /** Required when `autoEndpoint` is off and you post to a route of your own. */
  endpoint?: string
}

export interface UseLettermintReturn {
  send: (options: LettermintEmailOptions) => Promise<LettermintResponse>
  sending: Ref<boolean>
  error: Ref<string | null>
  lastMessageId: Ref<string | null>
}

const DEFAULT_ENDPOINT = '/api/lettermint/send'

export function useLettermint(options: UseLettermintOptions = {}): UseLettermintReturn {
  const sending = ref(false)
  const error = ref<string | null>(null)
  const lastMessageId = ref<string | null>(null)

  const endpoint = options.endpoint || DEFAULT_ENDPOINT
  const config = useRuntimeConfig()

  const send = async (message: LettermintEmailOptions): Promise<LettermintResponse> => {
    if (!options.endpoint && !config.public.lettermint?.autoEndpoint) {
      const reason = `No endpoint to send through: ${DEFAULT_ENDPOINT} is not registered. Set \`lettermint.autoEndpoint: true\` in nuxt.config.ts, or pass your own route: useLettermint({ endpoint: '/api/send' }).`
      error.value = reason

      return { success: false, error: reason }
    }

    sending.value = true
    error.value = null

    try {
      const raw = await $fetch<unknown>(endpoint, {
        method: 'POST',
        body: message,
      })

      // A page instead of JSON means nothing handled the request: with
      // autoEndpoint off, Nuxt answers an unregistered route with the app.
      if (typeof raw === 'string') {
        const reason = `The endpoint ${endpoint} answered with a page instead of JSON. Is the route registered?`
        error.value = reason

        return { success: false, error: reason }
      }

      // A custom endpoint may answer with the SDK result as it is, or with
      // nothing at all.
      const response = (raw ?? {}) as LettermintResponse & { message_id?: string }
      const messageId = response.messageId || response.message_id

      if (messageId) {
        lastMessageId.value = messageId
      }

      const result = { ...response, success: response.success ?? true, messageId }

      if (!result.success) {
        result.error = result.error || 'Failed to send email'
        error.value = result.error
      }

      return result
    }
    catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorMessage = (err as any)?.data?.statusMessage || (err as any)?.message || 'Failed to send email'
      error.value = errorMessage

      return {
        success: false,
        error: errorMessage,
      }
    }
    finally {
      sending.value = false
    }
  }

  return {
    send,
    sending,
    error,
    lastMessageId,
  }
}
