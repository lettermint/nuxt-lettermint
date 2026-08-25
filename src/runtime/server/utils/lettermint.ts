import { Lettermint } from 'lettermint'
import type { ApiClient, EmailEndpoint, SendBatchEmailResponse, SendBatchMailRequest, SendEmailResponse } from 'lettermint'
import { useRuntimeConfig } from '#imports'
import type { LettermintEmailOptions, LettermintTag } from '../../types'

export type { LettermintEmailOptions, LettermintSettings, LettermintTag } from '../../types'

/** @deprecated Use LettermintEmailOptions. */
export type SendEmailOptions = LettermintEmailOptions

type BatchMessage = SendBatchMailRequest[number]

let lettermintInstance: Lettermint | null = null
let apiInstance: ApiClient | null = null

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

export function useLettermint(): Lettermint {
  if (!lettermintInstance) {
    lettermintInstance = new Lettermint({
      ...getClientConfig(),
      apiToken: getApiKey(),
    })
  }

  return lettermintInstance
}

export function useLettermintApi(): ApiClient {
  if (!apiInstance) {
    apiInstance = Lettermint.api(getApiToken(), getClientConfig())
  }

  return apiInstance
}

// The builder holds the message being composed, so sharing one would let
// concurrent requests overwrite each other's payload.
function createEmail(): EmailEndpoint {
  return Lettermint.email(getApiKey(), getClientConfig())
}

function toArray(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value]
}

function isTagList(tags: string[] | LettermintTag[]): tags is LettermintTag[] {
  return typeof tags[0] === 'object'
}

// The API takes metadata as strings. Passing a number through unchanged would
// come back as a validation error rather than a value.
function toStringMap(values: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => [key, typeof value === 'string' ? value : String(value)]),
  )
}

function toPayload(options: LettermintEmailOptions): BatchMessage {
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

  if (options.tags?.length) {
    if (isTagList(options.tags)) {
      payload.tags = options.tags
    }
    else {
      payload.tag = options.tags[0] as string
    }
  }

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
      content: typeof attachment.content === 'string' ? attachment.content : attachment.content.toString('base64'),
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
  if (options.idempotencyKey) email = email.idempotencyKey(options.idempotencyKey)

  payload.attachments?.forEach((attachment) => {
    email = email.attach(attachment.filename, attachment.content, attachment.content_id ?? undefined, attachment.content_type ?? undefined)
  })

  return await email.send()
}

// One request, one result per message, in the order they were passed.
export async function sendEmails(
  messages: LettermintEmailOptions[],
  options: { idempotencyKey?: string } = {},
): Promise<SendBatchEmailResponse> {
  let email = createEmail()

  if (options.idempotencyKey) {
    email = email.idempotencyKey(options.idempotencyKey)
  }

  return await email.sendBatch(messages.map(toPayload))
}
