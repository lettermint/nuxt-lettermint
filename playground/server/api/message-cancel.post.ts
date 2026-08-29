import { defineEventHandler, readBody, createError } from 'h3'
// @ts-expect-error server auto-imports are not typed in the app context
import { useLettermintApi } from '#imports'

export default defineEventHandler(async (event) => {
  const { id } = await readBody<{ id?: string }>(event)

  if (!id) {
    throw createError({ statusCode: 400, message: 'Pass the message id to cancel' })
  }

  return await useLettermintApi().messages.cancel(id)
})
