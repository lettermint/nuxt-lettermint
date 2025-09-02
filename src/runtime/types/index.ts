export interface LettermintModuleOptions {
  apiKey?: string
  baseUrl?: string
  timeout?: number
}

export interface LettermintEmailAddress {
  email: string
  name?: string
}

export interface LettermintAttachment {
  filename: string
  content: string | Buffer
  contentType?: string
}

export interface LettermintEmailOptions {
  from: string | LettermintEmailAddress
  to: string | string[] | LettermintEmailAddress | LettermintEmailAddress[]
  subject: string
  text?: string
  html?: string
  cc?: string | string[] | LettermintEmailAddress | LettermintEmailAddress[]
  bcc?: string | string[] | LettermintEmailAddress | LettermintEmailAddress[]
  replyTo?: string | string[] | LettermintEmailAddress | LettermintEmailAddress[]
  headers?: Record<string, string>
  metadata?: Record<string, unknown>
  tags?: string[]
  attachments?: LettermintAttachment[]
  idempotencyKey?: string
}

export interface LettermintSendResponse {
  message_id: string
  status: 'pending' | 'sent' | 'failed'
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
