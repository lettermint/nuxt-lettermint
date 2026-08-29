import type { Ref } from 'vue'
import { $fetch, ref, useRuntimeConfig } from '#imports'
import type { LettermintApiResponse, LettermintEmailOptions } from '../types'

export type { LettermintEmailOptions } from '../types'

export type LettermintResponse = LettermintApiResponse

export interface UseLettermintOptions {
  /** Route to post to. Required when `autoEndpoint` is off. */
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

  const fail = (reason: string): LettermintResponse => {
    error.value = reason
    return { success: false, error: reason }
  }

  const send = async (message: LettermintEmailOptions): Promise<LettermintResponse> => {
    if (!options.endpoint && !config.public.lettermint?.autoEndpoint) {
      return fail(`No endpoint to send through: ${DEFAULT_ENDPOINT} is not registered. Set \`lettermint.autoEndpoint: true\` in nuxt.config.ts, or pass your own route: useLettermint({ endpoint: '/api/send' }).`)
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
        return fail(`The endpoint ${endpoint} answered with a page instead of JSON. Is the route registered?`)
      }

      // A custom endpoint may answer with the SDK result as it is, or with
      // nothing at all: a 2xx without an error counts as sent.
      const response = (raw ?? {}) as Record<string, unknown>
      const reason = typeof response.error === 'string' && response.error ? response.error : null
      const id = response.messageId ?? response.message_id
      const messageId = typeof id === 'string' && id ? id : undefined
      const scheduledAt = response.scheduledAt ?? response.scheduled_at

      if (response.success === false || (response.success === undefined && reason)) {
        return fail(reason || 'Failed to send email')
      }

      if (messageId) {
        lastMessageId.value = messageId
      }

      return {
        success: true,
        messageId,
        ...typeof response.status === 'string' && { status: response.status },
        ...typeof scheduledAt === 'string' && { scheduledAt },
      }
    }
    catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (err as any)?.data
      return fail(data?.message || data?.statusMessage || (err as Error)?.message || 'Failed to send email')
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
