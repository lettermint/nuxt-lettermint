import {
  sendEmail,
  toLettermintFailure,
  isLettermintError,
  LettermintApiError,
  LettermintError,
  LettermintHttpRequestError,
  LettermintValidationError,
} from '#imports'

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
      isApiError: error instanceof LettermintApiError,
      isHttpRequestError: error instanceof LettermintHttpRequestError,
      isBaseError: error instanceof LettermintError,
      name: (error as Error).name,
      failure: toLettermintFailure(error),
    }
  }
})
