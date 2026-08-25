import { $fetch } from 'ofetch'
import type { Ref } from 'vue'
import { ref, useRuntimeConfig } from '#imports'
import type { LettermintEmailOptions } from '../types'

export type { LettermintEmailOptions } from '../types'

export interface LettermintResponse {
  success: boolean
  messageId?: string
  status?: string
  error?: string
}

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
      // A custom endpoint may answer with the SDK result as it is.
      const response = await $fetch<LettermintResponse & { message_id?: string }>(endpoint, {
        method: 'POST',
        body: message,
      })

      const messageId = response.messageId || response.message_id

      if (messageId) {
        lastMessageId.value = messageId
      }

      return {
        ...response,
        success: response.success ?? true,
        messageId,
      }
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
