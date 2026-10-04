import { describe, it, expect } from 'vitest'
import {
  ApiError,
  AuthenticationError,
  ConnectionError,
  LettermintConfigError,
  LettermintError,
  LettermintValidationError,
  RateLimitError,
  RedirectError,
  ServerError,
  TimeoutError,
  UnexpectedResponseError,
  ValidationError,
  WebhookVerificationError,
} from 'lettermint'
import { isLettermintError, toLettermintFailure } from '../src/runtime/server/utils/errors'

describe('toLettermintFailure', () => {
  it('keeps the status and message of a validation error', () => {
    const body = { message: 'The from field is invalid', errors: { from: ['The from field is invalid'] } }
    const error = new ValidationError({ status: 422, message: 'The from field is invalid', body, errors: body.errors })

    expect(toLettermintFailure(error)).toEqual({
      statusCode: 422,
      message: 'The from field is invalid',
      data: body,
    })
  })

  it('reads a message reported under the error key', () => {
    // The SDK takes a string `error` as the code and falls back to the status text.
    const error = new ApiError({ status: 400, message: 'Bad Request', code: 'Unknown route', body: { error: 'Unknown route' } })

    expect(toLettermintFailure(error)).toEqual({
      statusCode: 400,
      message: 'Unknown route',
      data: { error: 'Unknown route' },
    })
  })

  it('reads the message of a nested error body', () => {
    const body = { error: { code: 'rate_limited', message: 'Slow down' } }
    const error = new RateLimitError({ status: 429, message: 'Slow down', code: 'rate_limited', body, retryAfter: 3 })

    expect(toLettermintFailure(error)).toEqual({ statusCode: 429, message: 'Slow down', data: body })
  })

  it('falls back to the error message when the body carries none', () => {
    const error = new ServerError({ status: 503, message: 'Service Unavailable', body: {} })

    expect(toLettermintFailure(error)).toEqual({
      statusCode: 503,
      message: 'Service Unavailable',
      data: {},
    })
  })

  it('leaves data out when the API answered with an empty body', () => {
    const error = new AuthenticationError({ status: 401, message: 'Unauthorized', body: undefined })

    expect(toLettermintFailure(error)).toEqual({ statusCode: 401, message: 'Unauthorized' })
  })

  it('answers a timeout with 504 rather than 500', () => {
    expect(toLettermintFailure(new TimeoutError(30000))).toEqual({
      statusCode: 504,
      message: 'The request to the Lettermint API timed out after 30000 ms.',
    })
  })

  it('answers an unreachable API with 502', () => {
    expect(toLettermintFailure(new ConnectionError(new TypeError('fetch failed')))).toEqual({
      statusCode: 502,
      message: 'Could not reach the email service',
      data: { cause: 'fetch failed' },
    })
  })

  it.each([
    ['an HTML error page', new UnexpectedResponseError('The Lettermint API answered with HTTP 502 and a body that is not JSON (text/html).', 502, '<html>')],
    ['an empty success', new UnexpectedResponseError('The Lettermint API answered with HTTP 200 and an empty body where JSON was expected.', 200, '')],
    ['a redirect', new RedirectError(301)],
  ])('answers %s with 502, whatever status it came with', (_label, error) => {
    expect(toLettermintFailure(error)).toEqual({
      statusCode: 502,
      message: 'The email service answered with an invalid response',
      data: { cause: error.message },
    })
  })

  it('answers input the SDK refused with 400 and the offending field', () => {
    const error = new LettermintValidationError('Message tag names must match ^[A-Za-z0-9_-]{1,32}$.', 'tags')

    expect(toLettermintFailure(error)).toEqual({
      statusCode: 400,
      message: 'Message tag names must match ^[A-Za-z0-9_-]{1,32}$.',
      data: { field: 'tags' },
    })
  })

  it('does not hand configuration detail to the caller', () => {
    const error = new LettermintConfigError('`baseUrl` must be an absolute http(s) URL.')

    expect(toLettermintFailure(error)).toEqual({
      statusCode: 500,
      message: 'The email service is not configured correctly',
    })
  })

  it('defaults any other SDK error to 500', () => {
    expect(toLettermintFailure(new LettermintError('Something went wrong'))).toEqual({
      statusCode: 500,
      message: 'Something went wrong',
    })
    expect(toLettermintFailure(new WebhookVerificationError('signature_mismatch', 'Bad signature'))).toEqual({
      statusCode: 500,
      message: 'Bad signature',
    })
  })

  it('recognises an API error from a second copy of the package', () => {
    // instanceof compares class identity, which fails when the dependency tree
    // holds more than one copy of the SDK. 3.0 names its errors explicitly.
    const foreign = Object.assign(new Error('Unprocessable Content'), {
      name: 'ValidationError',
      status: 422,
      body: { error: 'The to field is required' },
    })

    expect(toLettermintFailure(foreign)).toEqual({
      statusCode: 422,
      message: 'The to field is required',
      data: { error: 'The to field is required' },
    })
  })

  it('recognises a timeout from a second copy of the package', () => {
    const foreign = Object.assign(new Error('The request to the Lettermint API timed out after 300 ms.'), {
      name: 'TimeoutError',
      timeout: 300,
    })

    expect(toLettermintFailure(foreign)).toEqual({
      statusCode: 504,
      message: 'The request to the Lettermint API timed out after 300 ms.',
    })
  })

  it.each([
    ['a plain error', new Error('boom')],
    ['a string', 'boom'],
    ['null', null],
    ['an unrelated object', { status: 418, body: {} }],
    ['a DOMException timeout', new DOMException('The operation timed out.', 'TimeoutError')],
    ['another library\'s ValidationError', Object.assign(new Error('invalid'), { name: 'ValidationError' })],
    ['an SDK 2.x error shape', Object.assign(new Error('Validation error: to'), { statusCode: 422, responseBody: {} })],
  ])('leaves %s alone', (_label, value) => {
    expect(toLettermintFailure(value)).toBeNull()
    expect(isLettermintError(value)).toBe(false)
  })
})
