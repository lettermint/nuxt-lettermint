import { defineEventHandler, readBody, createError } from 'h3'
// @ts-expect-error server auto-imports are not typed in the app context
import { useLettermintApi } from '#imports'

export default defineEventHandler(async (event) => {
  const { id, scheduledAt } = await readBody<{ id?: string, scheduledAt?: string }>(event)

  if (!id || !scheduledAt) {
    throw createError({ statusCode: 400, message: 'Pass the message id and the new scheduledAt' })
  }

  return await useLettermintApi().messages.reschedule(id, { scheduled_at: scheduledAt })
})
