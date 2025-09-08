import { sendEmail } from '#imports'

export default defineEventHandler(async () => {
  try {
    const result = await sendEmail({
      from: 'nuxt@lettermint.dev',
      to: 'ok@testing.lettermint.co',
      subject: 'Test Email',
      html: '<h1>Hello from sendEmail function</h1>',
      tags: ['test'],
    })

    return {
      success: true,
      result,
    }
  }
  catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    }
  }
})
