import { sendEmail } from '#imports'

export default defineEventHandler(async () => {
  try {
    const result = await sendEmail({
      from: 'nuxt@lettermint.dev',
      to: ['ok@testing.lettermint.co', 'softbounce@testing.lettermint.co'],
      cc: ['ok@testing.lettermint.co', 'softbounce@testing.lettermint.co'],
      bcc: 'ok@testing.lettermint.co',
      subject: 'Test Multiple Recipients',
      text: 'Testing multiple recipients',
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
