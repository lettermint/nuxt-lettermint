import { useLettermintEmail } from '#imports'

export default defineEventHandler(async () => {
  try {
    const result = await useLettermintEmail()
      .from('nuxt@lettermint.dev')
      .to('ok@testing.lettermint.co')
      .subject('Test Builder')
      .text('Sent through a builder of its own')
      .send()

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
