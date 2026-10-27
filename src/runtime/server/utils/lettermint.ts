import { Lettermint, LettermintValidationError as SdkValidationError } from 'lettermint'
import type { EmailBuilder, EmailMessage, SendOptions } from 'lettermint'
import { useRuntimeConfig } from '#imports'
import { LettermintPayloadError } from './errors'
import type { LettermintAttachment, LettermintEmailOptions, LettermintTag, SendBatchEmailResponse, SendEmailResponse } from '../../types'

export type { LettermintEmailOptions, LettermintSettings, LettermintTag } from '../../types'

/** @deprecated Use LettermintEmailOptions. */
export type SendEmailOptions = LettermintEmailOptions

const API_KEY_MISSING = 'Lettermint API key is not configured. Please set NUXT_LETTERMINT_API_KEY environment variable or configure it in nuxt.config.ts'
const API_TOKEN_MISSING = 'Lettermint API token is not configured. The team API uses a different token than sending: create one in your team settings and set NUXT_LETTERMINT_API_TOKEN, or configure `lettermint.apiToken` in nuxt.config.ts'

/**
 * A client with every credential that is configured: the sending key for
 * `emails.*`, the team token for the rest. `requires` names the one the caller
 * cannot do without, so a missing credential fails with the module's own
 * message instead of the SDK's.
 *
 * The SDK client holds no message state, so sharing one would be safe; it is
 * still built per call so that it always reflects the current runtime config.
 */
function createClient(requires: 'apiKey' | 'apiToken'): Lettermint {
  const config = useRuntimeConfig().lettermint
  // SDK 3 refuses a token with surrounding whitespace, such as the trailing
  // newline of an env file, where fetch used to strip it from the header.
  const tokens = { apiKey: config?.apiKey?.trim(), apiToken: config?.apiToken?.trim() }

  if (!tokens[requires]) {
    throw new Error(requires === 'apiKey' ? API_KEY_MISSING : API_TOKEN_MISSING)
  }

  return new Lettermint({
    ...tokens.apiKey && { sendingToken: tokens.apiKey },
    ...tokens.apiToken && { teamToken: tokens.apiToken },
    ...config.baseUrl && { baseUrl: config.baseUrl },
    ...config.timeout && { timeout: config.timeout },
  })
}

/** The SDK client. Needs the sending key; the team API also works when a team token is configured. */
export function useLettermint(): Lettermint {
  return createClient('apiKey')
}

/**
 * A new email builder. The builder is immutable: every setter returns a new
 * builder, so keep the value it returns.
 */
export function useLettermintEmail(): EmailBuilder {
  return createClient('apiKey').emails.compose()
}

/** The SDK client for the team API. Needs the team token; sending also works when a sending key is configured. */
export function useLettermintApi(): Lettermint {
  return createClient('apiToken')
}

function toArray(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value]
}

function toTagList(tags: LettermintTag[]): LettermintTag[] {
  // The endpoint takes untyped JSON, so v1-style string entries can still arrive.
  const invalid = tags.findIndex(tag => typeof tag?.name !== 'string' || typeof tag?.value !== 'string')

  if (invalid !== -1) {
    throw new LettermintPayloadError(`Tag ${invalid} must be a { name, value } pair of strings. For a plain label, use the "tag" option.`)
  }

  return tags.map(({ name, value }) => ({ name, value }))
}

// The API takes metadata as strings.
function toStringMap(values: Record<string, unknown>): Record<string, string> {
  const entries: Array<[string, string]> = []

  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined) continue

    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      const kind = Array.isArray(value) ? 'an array' : typeof value === 'object' ? 'an object' : `a ${typeof value}`
      throw new LettermintPayloadError(`Metadata value for "${key}" must be a string, number or boolean, received ${kind}.`)
    }

    entries.push([key, String(value)])
  }

  return Object.fromEntries(entries)
}

// A Buffer that crossed the HTTP endpoint arrives JSON-serialized as
// { type: 'Buffer', data: [...] }.
function toAttachmentContent(attachment: LettermintAttachment): string {
  const { content } = attachment

  if (typeof content === 'string') return content
  if (Buffer.isBuffer(content)) return content.toString('base64')

  const serialized = content as { type?: unknown, data?: unknown }
  if (serialized?.type === 'Buffer' && Array.isArray(serialized.data)) {
    return Buffer.from(serialized.data as number[]).toString('base64')
  }

  throw new LettermintPayloadError(`Attachment content for "${attachment.filename}" must be a base64 string or a Buffer.`)
}

// A zoneless string would be read in the server's timezone.
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/

function toScheduledAt(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)

  if ((typeof value === 'string' && !ISO_WITH_ZONE.test(value)) || Number.isNaN(date.getTime())) {
    throw new LettermintPayloadError(`scheduledAt must be a Date or an ISO 8601 string with a timezone, such as "2026-09-01T09:00:00Z", received "${String(value)}".`)
  }

  return date.toISOString()
}

function toPayload(options: LettermintEmailOptions): EmailMessage {
  if (!options.text && !options.html) {
    throw new LettermintPayloadError('Either text or html content is required')
  }

  const payload: EmailMessage = {
    from: options.from,
    to: toArray(options.to),
    subject: options.subject,
  }

  if (options.text) payload.text = options.text
  if (options.html) payload.html = options.html
  if (options.cc) payload.cc = toArray(options.cc)
  if (options.bcc) payload.bcc = toArray(options.bcc)
  if (options.replyTo) payload.reply_to = toArray(options.replyTo)
  if (options.headers) payload.headers = options.headers
  if (options.metadata) payload.metadata = toStringMap(options.metadata)
  if (options.route) payload.route = options.route
  if (options.scheduledAt) payload.scheduled_at = toScheduledAt(options.scheduledAt)

  if (options.tag) payload.tag = options.tag
  if (options.tags?.length) payload.tags = toTagList(options.tags)

  if (options.settings) {
    payload.settings = {
      ...options.settings.trackOpens !== undefined && { track_opens: options.settings.trackOpens },
      ...options.settings.trackClicks !== undefined && { track_clicks: options.settings.trackClicks },
      ...options.settings.tls && { tls: options.settings.tls },
    }
  }

  if (options.attachments) {
    payload.attachments = options.attachments.map(attachment => ({
      filename: attachment.filename,
      content: toAttachmentContent(attachment),
      ...attachment.contentType && { content_type: attachment.contentType },
      ...attachment.contentId && { content_id: attachment.contentId },
    }))
  }

  return payload
}

// The SDK checks what it can before a request (tag format, the idempotency
// key), and rejects with its own validation error. That is the same refusal as
// the module's own mapping, so it surfaces as one.
async function refusingBadInput<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request()
  }
  catch (error) {
    if (error instanceof SdkValidationError) {
      throw new LettermintPayloadError(error.field ? `${error.field}: ${error.message}` : error.message, { cause: error })
    }

    throw error
  }
}

function sendOptions(idempotencyKey: string | undefined): SendOptions | undefined {
  return idempotencyKey ? { idempotencyKey } : undefined
}

export async function sendEmail(options: LettermintEmailOptions): Promise<SendEmailResponse> {
  const payload = toPayload(options)
  const { emails } = createClient('apiKey')

  return await refusingBadInput(() => emails.send(payload, sendOptions(options.idempotencyKey)))
}

export async function sendEmails(
  messages: Array<Omit<LettermintEmailOptions, 'idempotencyKey'> & { idempotencyKey?: never }>,
  options: { idempotencyKey?: string } = {},
): Promise<SendBatchEmailResponse> {
  const keyed = messages.findIndex(message => message.idempotencyKey)
  if (keyed !== -1) {
    throw new LettermintPayloadError(`Message ${keyed} carries an idempotencyKey, but the API applies idempotency to the batch as a whole. Pass it as sendEmails(messages, { idempotencyKey }).`)
  }

  const payloads = messages.map(toPayload)
  const { emails } = createClient('apiKey')

  return await refusingBadInput(() => emails.sendBatch(payloads, sendOptions(options.idempotencyKey)))
}
