import { sendEmail } from '#imports'

export default defineEventHandler(async () => {
  try {
    const result = await sendEmail({
      from: 'nuxt@lettermint.dev',
      to: 'ok@testing.lettermint.co',
      cc: 'ok@testing.lettermint.co',
      bcc: 'ok@testing.lettermint.co',
      replyTo: 'ok@testing.lettermint.co',
      subject: 'Test Full Options',
      text: 'Plain text version',
      html: '<h1>HTML version</h1>',
      headers: {
        'X-Custom-Header': 'custom-value',
      },
      metadata: {
        userId: '12345',
        campaign: 'test-campaign',
      },
      tags: ['test', 'full-options'],
      attachments: [
        {
          filename: 'test.txt',
          content: 'Test attachment content',
        },
      ],
    })

    return {
      success: true,
      result,
    }
  }
  catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    }
  }
})
