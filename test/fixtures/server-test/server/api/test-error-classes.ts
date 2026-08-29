import { sendEmail, toLettermintFailure, isLettermintError, LettermintValidationError } from '#imports'

export default defineEventHandler(async () => {
  try {
    await sendEmail({
      from: 'nuxt@lettermint.dev',
      to: 'ok@testing.lettermint.co',
      subject: 'Test Error Classes',
      text: 'This one is rejected by the mock',
    })

    return { threw: false }
  }
  catch (error) {
    return {
      threw: true,
      recognised: isLettermintError(error),
      isValidationError: error instanceof LettermintValidationError,
      failure: toLettermintFailure(error),
    }
  }
})
