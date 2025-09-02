import { Lettermint } from 'lettermint'
import { useRuntimeConfig } from '#imports'

let lettermintInstance: Lettermint | null = null

export function useLettermint(): Lettermint {
  if (!lettermintInstance) {
    const config = useRuntimeConfig()

    if (!config.lettermint?.apiKey) {
      throw new Error('Lettermint API key is not configured. Please set NUXT_LETTERMINT_API_KEY environment variable or configure it in nuxt.config.ts')
    }

    lettermintInstance = new Lettermint({
      apiToken: config.lettermint.apiKey,
    })
  }

  return lettermintInstance
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
  tags?: string[]
  attachments?: Array<{
    filename: string
    content: string | Buffer
    contentType?: string
  }>
}

export async function sendEmail(options: SendEmailOptions) {
  const lettermint = useLettermint()

  let email = lettermint.email
    .from(options.from)
    .subject(options.subject)

  // Add recipients
  if (Array.isArray(options.to)) {
    options.to.forEach((recipient) => {
      email = email.to(recipient)
    })
  }
  else {
    email = email.to(options.to)
  }

  // Add optional fields
  if (options.text) email = email.text(options.text)
  if (options.html) email = email.html(options.html)

  if (options.cc) {
    if (Array.isArray(options.cc)) {
      options.cc.forEach((recipient) => {
        email = email.cc(recipient)
      })
    }
    else {
      email = email.cc(options.cc)
    }
  }

  if (options.bcc) {
    if (Array.isArray(options.bcc)) {
      options.bcc.forEach((recipient) => {
        email = email.bcc(recipient)
      })
    }
    else {
      email = email.bcc(options.bcc)
    }
  }

  if (options.replyTo) {
    if (Array.isArray(options.replyTo)) {
      options.replyTo.forEach((recipient) => {
        email = email.replyTo(recipient)
      })
    }
    else {
      email = email.replyTo(options.replyTo)
    }
  }

  if (options.headers) {
    email = email.headers(options.headers)
  }

  if (options.metadata) {
    email = email.metadata(options.metadata as Record<string, string>)
  }

  if (options.tags) {
    options.tags.forEach((tag) => {
      email = email.tag(tag)
    })
  }

  if (options.attachments) {
    options.attachments.forEach((attachment) => {
      email = email.attach(
        attachment.filename,
        typeof attachment.content === 'string' ? attachment.content : attachment.content.toString('base64'),
      )
    })
  }

  return await email.send()
}
