import { defineEventHandler, readBody, createError } from 'h3'
import { sendEmail } from '../../utils/lettermint'
import { toLettermintFailure } from '../../utils/errors'
import type { LettermintEmailOptions } from '../../../types'

function assertSendable(body: LettermintEmailOptions | undefined) {
  const missing = (['from', 'to', 'subject'] as const).find(field => !body?.[field])

  if (missing) {
    throw createError({
      statusCode: 400,
      statusMessage: `Missing required field: ${missing}`,
    })
  }

  if (!body!.text && !body!.html) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Either text or html content is required',
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
    }
  }
  catch (error: unknown) {
    const failure = toLettermintFailure(error)

    if (failure) {
      throw createError({
        statusCode: failure.statusCode,
        statusMessage: failure.message,
      })
    }

    // Bad input the payload mapping refused (metadata, attachment content)
    if (error instanceof TypeError) {
      throw createError({
        statusCode: 400,
        statusMessage: error.message,
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error && error.message ? error.message : 'Internal server error while sending email',
    })
  }
})
