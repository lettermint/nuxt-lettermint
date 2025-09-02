import { defineEventHandler } from 'h3'
// @ts-expect-error - auto-imported from module
import { sendEmail } from '#imports'

export default defineEventHandler(async () => {
  try {
    const result = await sendEmail({
      from: 'demo@lettermint.co',
      to: 'ok@testing.lettermint.co',
      subject: 'Server-side Email from Nuxt Lettermint',
      text: 'This email was sent directly from the server using the Lettermint SDK.',
      html: '<h2>Server-side Email</h2><p>This email was sent directly from the server using the <strong>Lettermint SDK</strong>.</p>',
      tags: ['nuxt'],
    })

    return {
      success: true,
      message: 'Email sent from server',
      messageId: result.message_id,
      status: result.status,
    }
  }
  catch (error: unknown) {
    console.error('Server email demo error:', error)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any
    let errorMessage = 'Failed to send email from server'

    // Extract the actual validation message from Lettermint
    if (err?.responseBody?.message) {
      errorMessage = err.responseBody.message
    }
    else if (err?.message) {
      errorMessage = err.message
    }
    else if (err?.data?.message) {
      errorMessage = err.data.message
    }

    return {
      success: false,
      error: errorMessage,
      statusCode: err?.statusCode,
      errorType: err?.errorType,
    }
  }
})
