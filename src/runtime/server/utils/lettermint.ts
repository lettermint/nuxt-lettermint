import { Lettermint } from 'lettermint'
import type { EmailEndpoint, SendEmailResponse } from 'lettermint'
import { useRuntimeConfig } from '#imports'

let lettermintInstance: Lettermint | null = null

function getApiKey(): string {
  const config = useRuntimeConfig()

  if (!config.lettermint?.apiKey) {
    throw new Error('Lettermint API key is not configured. Please set NUXT_LETTERMINT_API_KEY environment variable or configure it in nuxt.config.ts')
  }

  return config.lettermint.apiKey
}

export function useLettermint(): Lettermint {
  if (!lettermintInstance) {
    lettermintInstance = new Lettermint({
      apiToken: getApiKey(),
    })
  }

  return lettermintInstance
}

/**
 * Create a dedicated email builder.
 *
 * The builder keeps the message it is composing as instance state, so a shared
 * one would let concurrent requests overwrite each other's payload. Every send
 * gets its own.
 */
function createEmail(): EmailEndpoint {
  return Lettermint.email(getApiKey())
}

export interface LettermintTag {
  name: string
  value: string
}

export interface SendEmailOptions {
  from: string
  to: string | string[]
  subject: string
  text?: string
  html?: string
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string | string[]
  headers?: Record<string, string>
  metadata?: Record<string, unknown>
  /**
   * A single tag (`string[]` uses its first entry), or key/value tags.
   */
  tags?: string[] | LettermintTag[]
  attachments?: Array<{
    filename: string
    content: string | Buffer
    contentType?: string
    /** Set to reference the attachment from the HTML body (inline attachment). */
    contentId?: string
  }>
  /** Deliver through a specific route instead of the project default. */
  route?: string
  /** Reuse to make retries of the same send idempotent. */
  idempotencyKey?: string
}

function toArray(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value]
}

function isTagList(tags: string[] | LettermintTag[]): tags is LettermintTag[] {
  return typeof tags[0] === 'object'
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResponse> {
  let email = createEmail()
    .from(options.from)
    .subject(options.subject)
    .to(...toArray(options.to))

  // Add optional fields
  if (options.text) email = email.text(options.text)
  if (options.html) email = email.html(options.html)

  if (options.cc) email = email.cc(...toArray(options.cc))
  if (options.bcc) email = email.bcc(...toArray(options.bcc))
  if (options.replyTo) email = email.replyTo(...toArray(options.replyTo))

  if (options.headers) {
    email = email.headers(options.headers)
  }

  if (options.metadata) {
    email = email.metadata(options.metadata as Record<string, string>)
  }

  if (options.tags?.length) {
    email = isTagList(options.tags)
      ? email.tags(options.tags)
      : email.tag(options.tags[0] as string)
  }

  if (options.route) {
    email = email.route(options.route)
  }

  if (options.idempotencyKey) {
    email = email.idempotencyKey(options.idempotencyKey)
  }

  if (options.attachments) {
    options.attachments.forEach((attachment) => {
      email = email.attach(
        attachment.filename,
        typeof attachment.content === 'string' ? attachment.content : attachment.content.toString('base64'),
        attachment.contentId,
        attachment.contentType,
      )
    })
  }

  return await email.send()
}
