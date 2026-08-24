import { sendEmails } from '#imports'

export default defineEventHandler(async () => {
  try {
    const result = await sendEmails([
      {
        from: 'nuxt@lettermint.dev',
        to: 'first@testing.lettermint.co',
        subject: 'First',
        text: 'First message',
      },
      {
        from: 'nuxt@lettermint.dev',
        to: ['second@testing.lettermint.co', 'third@testing.lettermint.co'],
        subject: 'Second',
        text: 'Second message',
      },
    ], { idempotencyKey: 'batch-fixture' })

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
