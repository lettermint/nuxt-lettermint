import type {
  MessageStatus as SdkMessageStatus,
  SendBatchEmailResponse as SdkSendBatchEmailResponse,
  SendEmailResponse as SdkSendEmailResponse,
  TlsPolicy as SdkTlsPolicy,
} from 'lettermint'

// Aliases rather than `export type * from 'lettermint'`: the declaration
// bundler drops the `type` modifier, which would advertise SDK classes this
// package does not export at runtime.
export type MessageStatus = SdkMessageStatus
export type TlsPolicy = SdkTlsPolicy
export type SendEmailResponse = SdkSendEmailResponse
export type SendBatchEmailResponse = SdkSendBatchEmailResponse

export type { LettermintFailure } from '../server/utils/errors'

export interface LettermintModuleOptions {
  /** Project sending token. Prefer the NUXT_LETTERMINT_API_KEY environment variable. */
  apiKey?: string
  /** Team API token. Separate from the sending key, and server-side only. */
  apiToken?: string
  baseUrl?: string
  timeout?: number
  /**
   * Register /api/lettermint/send. The route has no authentication of its own,
   * so it is off unless you opt in and guard it.
   */
  autoEndpoint?: boolean
}

export interface LettermintAttachment {
  filename: string
  /** Base64-encoded file content, or a Buffer. */
  content: string | Buffer
  contentType?: string
  /** Set to reference the attachment from the HTML body (inline attachment). */
  contentId?: string
}

export interface LettermintTag {
  name: string
  value: string
}

export interface LettermintSettings {
  trackOpens?: boolean
  trackClicks?: boolean
  tls?: TlsPolicy
}

export interface LettermintEmailOptions {
  from: string
  to: string | string[]
  subject: string
  text?: string
  html?: string
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string | string[]
  headers?: Record<string, string>
  /** Sent as strings; null and undefined entries are dropped. */
  metadata?: Record<string, string | number | boolean | null | undefined>
  /** A plain label for the message. */
  tag?: string
  /** Key/value tags; may be combined with `tag`. */
  tags?: LettermintTag[]
  attachments?: LettermintAttachment[]
  settings?: LettermintSettings
  route?: string
  idempotencyKey?: string
  /** Deliver at this time instead of immediately, as a Date or an ISO 8601 string with a timezone. The API accepts at most 30 days ahead. */
  scheduledAt?: string | Date
}

/** The SDK's send result, in the API's own snake_case. */
export type LettermintSendResponse = SendEmailResponse

/** What the module's /api/lettermint/send endpoint answers with. */
export type LettermintApiResponse
  = | {
    success: true
    messageId?: string
    status?: MessageStatus | (string & {})
    scheduledAt?: string
  }
  | {
    success: false
    error: string
  }
