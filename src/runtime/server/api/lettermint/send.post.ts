import { defineEventHandler, readBody, createError } from 'h3'
import { sendEmail } from '../../utils/lettermint'
import { toLettermintFailure, LettermintPayloadError } from '../../utils/errors'
import type { LettermintEmailOptions } from '../../../types'

function assertSendable(body: LettermintEmailOptions | undefined) {
  const missing = (['from', 'to', 'subject'] as const).find((field) => {
    const value = body?.[field]
    return !value || (Array.isArray(value) && value.length === 0)
  })

  if (missing) {
    throw createError({
      statusCode: 400,
      message: `Missing required field: ${missing}`,
    })
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<LettermintEmailOptions>(event)

  assertSendable(body)

  try {
    const result = await sendEmail(body)

    return {
      success: true,
      messageId: result.message_id,
      status: result.status,
      ...result.scheduled_at && { scheduledAt: result.scheduled_at },
    }
  }
  catch (error: unknown) {
    if (error instanceof LettermintPayloadError) {
      throw createError({
        statusCode: 400,
        message: error.message,
      })
    }

    const failure = toLettermintFailure(error)

    // Upstream 401/403 means the configured key is wrong: the server's fault,
    // not the caller's. Replaying it verbatim trips app-level auth handling.
    if (failure && (failure.statusCode === 401 || failure.statusCode === 403)) {
      console.error('[nuxt-lettermint] The Lettermint API rejected the configured credentials:', failure.message)

      throw createError({
        statusCode: 502,
        message: 'The email service rejected the server credentials',
      })
    }

    if (failure) {
      throw createError({
        statusCode: failure.statusCode,
        message: failure.message,
        data: failure.data,
      })
    }

    console.error('[nuxt-lettermint] Sending failed:', error)

    // undici reports network failures (DNS, connection refused) this way.
    if (error instanceof TypeError && error.message === 'fetch failed') {
      throw createError({
        statusCode: 502,
        message: 'Could not reach the email service',
      })
    }

    throw createError({
      statusCode: 500,
      message: 'Internal server error while sending email',
    })
  }
})
