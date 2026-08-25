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

export interface LettermintModuleOptions {
  apiKey?: string
  apiToken?: string
  baseUrl?: string
  timeout?: number
  autoEndpoint?: boolean
}

export interface LettermintAttachment {
  filename: string
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
  metadata?: Record<string, unknown>
  /** A single tag (`string[]` uses its first entry), or key/value tags. */
  tags?: string[] | LettermintTag[]
  attachments?: LettermintAttachment[]
  settings?: LettermintSettings
  route?: string
  idempotencyKey?: string
}

export interface LettermintSendResponse {
  message_id: string
  status: MessageStatus
}

export interface LettermintApiResponse {
  success: boolean
  messageId?: string
  status?: string
  error?: string
}
