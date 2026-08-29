import { describe, it, expect } from 'vitest'
import { ClientError, HttpRequestError, LettermintError, TimeoutError, ValidationError } from 'lettermint'
import { isLettermintError, toLettermintFailure } from '../src/runtime/server/utils/errors'

describe('toLettermintFailure', () => {
  it('keeps the status and message of a validation error', () => {
    const error = new ValidationError('Validation error: from', 'from', { message: 'The from field is invalid' })

    expect(toLettermintFailure(error)).toEqual({
      statusCode: 422,
      message: 'The from field is invalid',
      data: { message: 'The from field is invalid' },
    })
  })

  it('reads a message reported under the error key', () => {
    const error = new ClientError('Client error: Unknown route', { error: 'Unknown route' })

    expect(toLettermintFailure(error)).toEqual({
      statusCode: 400,
      message: 'Unknown route',
      data: { error: 'Unknown route' },
    })
  })

  it('falls back to the error message when the body carries none', () => {
    const error = new HttpRequestError('HTTP error 503 Service Unavailable', 503, {})

    expect(toLettermintFailure(error)).toEqual({
      statusCode: 503,
      message: 'HTTP error 503 Service Unavailable',
      data: {},
    })
  })

  it('answers a timeout with 504 rather than 500', () => {
    const error = new TimeoutError('Request timeout after 30000ms')

    expect(toLettermintFailure(error)).toEqual({
      statusCode: 504,
      message: 'Request timeout after 30000ms',
    })
  })

  it('defaults an SDK error without a status to 500', () => {
    expect(toLettermintFailure(new LettermintError('Something went wrong'))).toEqual({
      statusCode: 500,
      message: 'Something went wrong',
    })
  })

  it('recognises a request error from a second copy of the package', () => {
    // instanceof compares class identity, which fails when the dependency tree
    // holds more than one copy of the SDK. The error name is no help either:
    // the SDK ships minified, so ValidationError reports its name as "d".
    const foreign = Object.assign(new Error('Validation error: to'), {
      statusCode: 422,
      responseBody: { error: 'The to field is required' },
    })

    expect(toLettermintFailure(foreign)).toEqual({
      statusCode: 422,
      message: 'The to field is required',
      data: { error: 'The to field is required' },
    })
  })

  it('recognises a timeout from a second copy of the package', () => {
    const foreign = new Error('Request timeout after 30000ms')

    expect(toLettermintFailure(foreign)).toEqual({
      statusCode: 504,
      message: 'Request timeout after 30000ms',
    })
  })

  it.each([
    ['a plain error', new Error('boom')],
    ['a string', 'boom'],
    ['null', null],
    ['an unrelated object', { statusCode: 418 }],
  ])('leaves %s alone', (_label, value) => {
    expect(toLettermintFailure(value)).toBeNull()
    expect(isLettermintError(value)).toBe(false)
  })
})
