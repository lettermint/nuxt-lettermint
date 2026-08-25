import { defineEventHandler } from 'h3'
// @ts-expect-error server auto-imports are not typed in the app context
import { sendEmail, toLettermintFailure } from '#imports'
// In an app these come from the package: import type { ... } from 'nuxt-lettermint'
import type { LettermintEmailOptions } from '../../../src/runtime/types'
import type { MessageStatus } from 'lettermint'

const demo: LettermintEmailOptions = {
  from: 'demo@lettermint.co',
  to: 'ok@testing.lettermint.co',
  subject: 'Server-side Email from Nuxt Lettermint',
  text: 'This email was sent directly from the server using the Lettermint SDK.',
  html: '<h2>Server-side Email</h2><p>This email was sent directly from the server using the <strong>Lettermint SDK</strong>.</p>',
  tags: ['nuxt'],
}

export default defineEventHandler(async () => {
  try {
    const result = await sendEmail(demo)
    const status: MessageStatus = result.status

    return {
      success: true,
      message: 'Email sent from server',
      messageId: result.message_id,
      status,
    }
  }
  catch (error: unknown) {
    const failure = toLettermintFailure(error)

    return {
      success: false,
      error: failure?.message || 'Failed to send email from server',
      statusCode: failure?.statusCode,
    }
  }
})
