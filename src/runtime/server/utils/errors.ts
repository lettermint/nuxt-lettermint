import { LettermintError } from 'lettermint'

export {
  LettermintError,
  LettermintConfigError,
  ApiError as LettermintApiError,
  AuthenticationError as LettermintAuthenticationError,
  PermissionError as LettermintPermissionError,
  NotFoundError as LettermintNotFoundError,
  ConflictError as LettermintConflictError,
  ValidationError as LettermintValidationError,
  RateLimitError as LettermintRateLimitError,
  ServerError as LettermintServerError,
  TimeoutError as LettermintTimeoutError,
  ConnectionError as LettermintConnectionError,
  UnexpectedResponseError as LettermintUnexpectedResponseError,
  RedirectError as LettermintRedirectError,
} from 'lettermint'

// Deprecated: use LettermintApiError. SDK 3 replaced HttpRequestError with
// ApiError, which reads `status` and `body` instead of `statusCode` and
// `responseBody`. Kept so `instanceof` checks written for v2 still match.
export { ApiError as LettermintHttpRequestError } from 'lettermint'

/**
 * Bad input refused before anything went on the wire: by the module's payload
 * mapping, or by the SDK's own checks (tag format, the idempotency key). A
 * subclass so the endpoint can answer 400 without catching every TypeError.
 */
export class LettermintPayloadError extends TypeError {}

export interface LettermintFailure {
  statusCode: number
  message: string
  /** The parsed API response body when there was one, or detail on what went wrong. */
  data?: unknown
}

const BAD_GATEWAY = 502
const TIMEOUT_STATUS = 504
const UNKNOWN_STATUS = 500

// Every SDK error sets an explicit `name`. With them, an error from a second
// copy of the SDK in the tree (where `instanceof` fails) is still recognised.
// The shape check keeps generic names such as `TimeoutError` (DOMException)
// or `ValidationError` from matching errors that are not the SDK's.
const API_ERRORS = new Set([
  'ApiError',
  'AuthenticationError',
  'PermissionError',
  'NotFoundError',
  'ConflictError',
  'ValidationError',
  'RateLimitError',
  'ServerError',
])

type Kind = 'api' | 'timeout' | 'connection' | 'response' | 'config' | 'input' | 'other'

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null
}

function kindOf(error: unknown): Kind | null {
  if (!(error instanceof Error)) return null

  const record = error as unknown as Record<string, unknown>
  const status = typeof record.status === 'number'
  const ours = error instanceof LettermintError

  if ((ours || API_ERRORS.has(error.name)) && status && 'body' in record) return 'api'

  switch (error.name) {
    case 'TimeoutError':
      return ours || typeof record.timeout === 'number' ? 'timeout' : null
    case 'ConnectionError':
      return ours || error.message.startsWith('Could not reach the Lettermint API') ? 'connection' : null
    case 'UnexpectedResponseError':
      return ours || (status && typeof record.bodyExcerpt === 'string') ? 'response' : null
    case 'RedirectError':
      return ours || (status && error.message.includes('Lettermint API')) ? 'response' : null
    case 'LettermintConfigError':
      return 'config'
    case 'LettermintValidationError':
      return 'input'
    case 'LettermintError':
      return 'other'
  }

  return ours ? 'other' : null
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

function causeOf(error: Error): string {
  const { cause } = error
  return cause instanceof Error && cause.message ? cause.message : error.message
}

export function isLettermintError(error: unknown): boolean {
  return kindOf(error) !== null
}

/**
 * Turns an SDK error into a status and a message to answer with, or `null`
 * for anything the SDK did not raise.
 *
 * - An error status from the API keeps its status, the API's message and the
 *   response body as `data`.
 * - A timeout is a 504; an unreachable API or a response that is not JSON
 *   (a proxy's HTML page, a redirect) is a 502.
 * - Input the SDK refused before sending is a 400.
 * - A misconfigured client is a 500 with a generic message, so configuration
 *   detail is not handed to the caller. Log the error itself.
 */
export function toLettermintFailure(error: unknown): LettermintFailure | null {
  const kind = kindOf(error)

  if (!kind) return null

  const record = error as Error & Record<string, unknown>

  switch (kind) {
    case 'api':
      return {
        statusCode: record.status as number,
        message: messageFromBody(record.body) || record.message || 'Failed to send email',
        ...record.body !== undefined && { data: record.body },
      }
    case 'timeout':
      return { statusCode: TIMEOUT_STATUS, message: record.message }
    case 'connection':
      return { statusCode: BAD_GATEWAY, message: 'Could not reach the email service', data: { cause: causeOf(record) } }
    case 'response':
      return { statusCode: BAD_GATEWAY, message: 'The email service answered with an invalid response', data: { cause: record.message } }
    case 'config':
      return { statusCode: UNKNOWN_STATUS, message: 'The email service is not configured correctly' }
    case 'input':
      return {
        statusCode: 400,
        message: record.message,
        ...typeof record.field === 'string' && { data: { field: record.field } },
      }
    default:
      return { statusCode: UNKNOWN_STATUS, message: record.message || 'Failed to send email' }
  }
}
