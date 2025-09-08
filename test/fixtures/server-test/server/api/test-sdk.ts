import { useLettermint } from '#imports'

export default defineEventHandler(async () => {
  try {
    const lettermint = useLettermint()

    const result = await lettermint.email
      .from('nuxt@lettermint.dev')
      .to('ok@testing.lettermint.co')
      .subject('Test SDK Email')
      .html('<h1>Hello from Lettermint SDK</h1>')
      .tag('sdk-test')
      .send()

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
