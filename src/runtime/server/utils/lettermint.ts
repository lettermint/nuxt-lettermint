import { Lettermint } from 'lettermint'
import type { ApiClient, EmailEndpoint, SendBatchMailRequest } from 'lettermint'
import { useRuntimeConfig } from '#imports'
import { LettermintPayloadError } from './errors'
import type { LettermintAttachment, LettermintEmailOptions, LettermintTag, SendBatchEmailResponse, SendEmailResponse } from '../../types'

export type { LettermintEmailOptions, LettermintSettings, LettermintTag } from '../../types'

/** @deprecated Use LettermintEmailOptions. */
export type SendEmailOptions = LettermintEmailOptions

type BatchMessage = SendBatchMailRequest[number]

function getApiKey(): string {
  const config = useRuntimeConfig()

  if (!config.lettermint?.apiKey) {
    throw new Error('Lettermint API key is not configured. Please set NUXT_LETTERMINT_API_KEY environment variable or configure it in nuxt.config.ts')
  }

  return config.lettermint.apiKey
}

function getClientConfig(): { baseUrl?: string, timeout?: number } {
  const config = useRuntimeConfig()

  return {
    ...config.lettermint?.baseUrl && { baseUrl: config.lettermint.baseUrl },
    ...config.lettermint?.timeout && { timeout: config.lettermint.timeout },
  }
}

function getApiToken(): string {
  const config = useRuntimeConfig()

  if (!config.lettermint?.apiToken) {
    throw new Error('Lettermint API token is not configured. The team API uses a different token than sending: create one in your team settings and set NUXT_LETTERMINT_API_TOKEN, or configure `lettermint.apiToken` in nuxt.config.ts')
  }

  return config.lettermint.apiToken
}

// A new instance per call: the builder holds the message being composed, so a
// shared one would let concurrent requests overwrite each other.
export function useLettermint(): Lettermint {
  return new Lettermint({
    ...getClientConfig(),
    apiToken: getApiKey(),
  })
}

export function useLettermintEmail(): EmailEndpoint {
  return createEmail()
}

export function useLettermintApi(): ApiClient {
  return Lettermint.api(getApiToken(), getClientConfig())
}

function createEmail(): EmailEndpoint {
  return Lettermint.email(getApiKey(), getClientConfig())
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

function toScheduledAt(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new LettermintPayloadError(`scheduledAt must be a Date or an ISO 8601 string, received "${String(value)}".`)
  }

  return date.toISOString()
}

function toPayload(options: LettermintEmailOptions): BatchMessage {
  if (!options.text && !options.html) {
    throw new LettermintPayloadError('Either text or html content is required')
  }

  const payload: BatchMessage = {
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

export async function sendEmail(options: LettermintEmailOptions): Promise<SendEmailResponse> {
  const payload = toPayload(options)

  let email = createEmail()
    .from(payload.from)
    .to(...payload.to)
    .subject(payload.subject)

  if (payload.text) email = email.text(payload.text)
  if (payload.html) email = email.html(payload.html)
  if (payload.cc) email = email.cc(...payload.cc)
  if (payload.bcc) email = email.bcc(...payload.bcc)
  if (payload.reply_to) email = email.replyTo(...payload.reply_to)
  if (payload.headers) email = email.headers(payload.headers)
  if (payload.metadata) email = email.metadata(payload.metadata)
  if (payload.tag) email = email.tag(payload.tag)
  if (payload.tags) email = email.tags(payload.tags)
  if (payload.settings) email = email.settings(payload.settings)
  if (payload.route) email = email.route(payload.route)
  if (payload.scheduled_at) email = email.scheduledAt(payload.scheduled_at)
  if (options.idempotencyKey) email = email.idempotencyKey(options.idempotencyKey)

  payload.attachments?.forEach((attachment) => {
    email = email.attach(attachment.filename, attachment.content, attachment.content_id ?? undefined, attachment.content_type ?? undefined)
  })

  return await email.send()
}

export async function sendEmails(
  messages: Array<Omit<LettermintEmailOptions, 'idempotencyKey'> & { idempotencyKey?: never }>,
  options: { idempotencyKey?: string } = {},
): Promise<SendBatchEmailResponse> {
  const keyed = messages.findIndex(message => message.idempotencyKey)
  if (keyed !== -1) {
    throw new LettermintPayloadError(`Message ${keyed} carries an idempotencyKey, but the API applies idempotency to the batch as a whole. Pass it as sendEmails(messages, { idempotencyKey }).`)
  }

  let email = createEmail()

  if (options.idempotencyKey) {
    email = email.idempotencyKey(options.idempotencyKey)
  }

  return await email.sendBatch(messages.map(toPayload))
}
