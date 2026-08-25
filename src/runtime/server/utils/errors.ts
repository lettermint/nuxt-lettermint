import { ClientError, HttpRequestError, LettermintError, TimeoutError, ValidationError } from 'lettermint'

export {
  LettermintError,
  ClientError as LettermintClientError,
  HttpRequestError as LettermintHttpRequestError,
  TimeoutError as LettermintTimeoutError,
  ValidationError as LettermintValidationError,
}

export type * from 'lettermint'

export interface LettermintFailure {
  statusCode: number
  message: string
}

const TIMEOUT_STATUS = 504
const UNKNOWN_STATUS = 500

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null
}

function messageFromBody(body: unknown): string | null {
  const record = asRecord(body)

  if (!record) return null

  for (const key of ['message', 'error']) {
    const value = record[key]
    if (typeof value === 'string' && value) return value
  }

  return null
}

const TIMEOUT_MESSAGE = /^Request timeout after \d+ms$/

/**
 * `instanceof` fails when the tree holds a second copy of the SDK, and
 * `error.name` is no fallback: the SDK ships minified, so every error is named
 * after its mangled class (`d`, `y`). `responseBody` is what its request errors
 * carry and nothing else in the Nuxt stack sets.
 */
export function isLettermintError(error: unknown): boolean {
  if (error instanceof LettermintError) return true

  const record = asRecord(error)

  if (!record || !(error instanceof Error)) return false

  return 'responseBody' in record || TIMEOUT_MESSAGE.test(record.message as string)
}

export function toLettermintFailure(error: unknown): LettermintFailure | null {
  if (!isLettermintError(error)) return null

  const record = asRecord(error)!
  const timedOut = error instanceof TimeoutError || TIMEOUT_MESSAGE.test(record.message as string)

  const statusCode = typeof record.statusCode === 'number'
    ? record.statusCode
    : timedOut ? TIMEOUT_STATUS : UNKNOWN_STATUS

  const message = messageFromBody(record.responseBody)
    || (typeof record.message === 'string' && record.message ? record.message : null)
    || 'Failed to send email'

  return { statusCode, message }
}
