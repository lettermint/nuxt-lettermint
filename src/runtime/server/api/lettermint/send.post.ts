import { defineEventHandler, readBody, createError } from 'h3'
import { sendEmail, type SendEmailOptions } from '../../utils/lettermint'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<SendEmailOptions>(event)

    // Validate required fields
    if (!body.from) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required field: from',
      })
    }

    if (!body.to) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required field: to',
      })
    }

    if (!body.subject) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required field: subject',
      })
    }

    if (!body.text && !body.html) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Either text or html content is required',
      })
    }

    // Send the email
    const result = await sendEmail(body)

    return {
      success: true,
      messageId: result.message_id,
      status: result.status,
    }
  }
  catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any

    // Handle Lettermint SDK errors with responseBody
    if (err.responseBody?.message) {
      throw createError({
        statusCode: err.statusCode || 422,
        statusMessage: err.responseBody.message,
      })
    }

    // Handle Lettermint API errors
    if (err.response) {
      throw createError({
        statusCode: err.response.status || 500,
        statusMessage: err.response.data?.message || 'Failed to send email',
      })
    }

    // Handle validation errors
    if (err.statusCode) {
      throw createError({
        statusCode: err.statusCode,
        statusMessage: err.message || 'Validation error',
      })
    }

    // Handle other errors
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Internal server error while sending email',
    })
  }
})
