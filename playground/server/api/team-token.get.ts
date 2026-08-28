import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(() => ({
  configured: Boolean(useRuntimeConfig().lettermint?.apiToken),
}))
