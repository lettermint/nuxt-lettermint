import { defineEventHandler, createError } from 'h3'
// @ts-expect-error server auto-imports are not typed in the app context
import { sendEmail, toLettermintFailure } from '#imports'
// In an app these come from the package: import type { ... } from 'nuxt-lettermint'
import type { LettermintEmailOptions } from '../../../src/runtime/types'

const demo: LettermintEmailOptions = {
  from: process.env.PLAYGROUND_FROM_EMAIL || 'demo@lettermint.co',
  to: 'ok@testing.lettermint.co',
  subject: 'Server-side Email from Nuxt Lettermint',
  text: 'This email was sent directly from the server using the Lettermint SDK.',
  html: '<h2>Server-side Email</h2><p>This email was sent directly from the server using the <strong>Lettermint SDK</strong>.</p>',
  tag: 'nuxt',
  tags: [{ name: 'source', value: 'playground' }],
}

export default defineEventHandler(async () => {
  try {
    const result = await sendEmail(demo)

    return {
      success: true,
      message: 'Email sent from server',
      messageId: result.message_id,
      status: result.status,
    }
  }
  catch (error: unknown) {
    const failure = toLettermintFailure(error)

    if (failure) {
      throw createError({
        statusCode: failure.statusCode,
        message: failure.message,
        data: failure.data,
      })
    }

    console.error('[playground] Sending failed:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to send email from server',
    })
  }
})
