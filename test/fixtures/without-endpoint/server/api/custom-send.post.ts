import { sendEmail } from '#imports'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // Custom logic here
  console.log('Custom endpoint called with:', body)

  // Use the sendEmail utility
  return await sendEmail(body)
})
