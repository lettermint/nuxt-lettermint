import { defineEventHandler, createError } from 'h3'
// @ts-expect-error server auto-imports are not typed in the app context
import { sendEmails, toLettermintFailure } from '#imports'

export default defineEventHandler(async () => {
  const from = process.env.PLAYGROUND_FROM_EMAIL || 'demo@lettermint.co'
  const inAnHour = new Date(Date.now() + 60 * 60 * 1000)

  try {
    const results = await sendEmails(
      [
        {
          from,
          to: 'ok@testing.lettermint.co',
          subject: 'Batch demo: sent right away',
          text: 'The first message of the batch goes out immediately.',
        },
        {
          from,
          to: 'ok@testing.lettermint.co',
          subject: 'Batch demo: scheduled',
          text: 'The second message of the batch is scheduled an hour out.',
          scheduledAt: inAnHour,
        },
      ],
      // Keyed on the same timestamp the payload carries: a retry within the
      // same second replays identically, anything later is a new request.
      { idempotencyKey: `playground-batch-${inAnHour.toISOString()}` },
    )

    return { success: true, results }
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

    console.error('[playground] Batch send failed:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to send the batch',
    })
  }
})
