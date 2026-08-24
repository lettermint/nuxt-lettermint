import { $fetch } from 'ofetch'
import type { Ref } from 'vue'
import { ref } from '#imports'
import type { LettermintEmailOptions } from '../types'

export type { LettermintEmailOptions } from '../types'

export interface LettermintResponse {
  success: boolean
  messageId?: string
  status?: string
  error?: string
}

export interface UseLettermintReturn {
  send: (options: LettermintEmailOptions) => Promise<LettermintResponse>
  sending: Ref<boolean>
  error: Ref<string | null>
  lastMessageId: Ref<string | null>
}

export function useLettermint(): UseLettermintReturn {
  const sending = ref(false)
  const error = ref<string | null>(null)
  const lastMessageId = ref<string | null>(null)

  const send = async (options: LettermintEmailOptions): Promise<LettermintResponse> => {
    sending.value = true
    error.value = null

    try {
      const response = await $fetch('/api/lettermint/send', {
        method: 'POST',
        body: options,
      })

      if (response.messageId) {
        lastMessageId.value = response.messageId
      }

      return response
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
