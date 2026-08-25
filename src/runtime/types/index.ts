import type { MessageStatus, TlsPolicy } from 'lettermint'

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

export interface LettermintError {
  statusCode: number
  statusMessage: string
  data?: unknown
}
