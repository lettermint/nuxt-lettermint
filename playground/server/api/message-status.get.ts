import { defineEventHandler, getQuery, createError } from 'h3'
// @ts-expect-error server auto-imports are not typed in the app context
import { useLettermintApi } from '#imports'

// The team API needs NUXT_LETTERMINT_API_TOKEN, a separate credential from
// the sending key. Keep routes like these server-side.
export default defineEventHandler(async (event) => {
  const id = String(getQuery(event).id || '').trim()

  if (!id) {
    throw createError({ statusCode: 400, message: 'Pass a message id: /api/message-status?id=...' })
  }

  return await useLettermintApi().messages.retrieve(id)
})
