# Nuxt Lettermint Module

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

A Nuxt module for sending emails using the [Lettermint](https://lettermint.co) email service. This module provides a seamless integration with Lettermint's Node.js SDK for both server-side and client-side email sending capabilities.

## Features

- 🚀 Full TypeScript support
- 🔒 Secure API key management (server-side only)
- 📧 Simple composable for client-side usage
- 🛠️ Direct server-side SDK access
- ⚙️ Flexible configuration via environment variables or `nuxt.config.ts`
- 🎯 Compatible with Nuxt 3 and Nuxt 4

## Quick Setup

### 1. Install the module

```bash
# npm
npm install nuxt-lettermint

# pnpm
pnpm add nuxt-lettermint

# yarn
yarn add nuxt-lettermint
```

### 2. Add to your Nuxt config

```javascript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-lettermint']
})
```

### 3. Configure your API key

Create a `.env` file in your project root:

```bash
NUXT_LETTERMINT_API_KEY=your-lettermint-api-key
```

## Usage

### Client-Side

```vue
<script setup>
const { send, sending, error } = useLettermint()

await send({
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Hello!',
  html: '<h1>Hello World</h1>'
})
</script>
```

### Server-Side

```typescript
// server/api/send.post.ts
import { sendEmail } from '#imports'

export default defineEventHandler(async () => {
  return await sendEmail({
    from: 'hello@example.com',
    to: 'user@example.com',
    subject: 'Welcome',
    html: '<h1>Welcome!</h1>',
    tags: ['welcome']
  })
})
```

### Advanced Usage

```typescript
import { useLettermint } from '#imports'

const lettermint = useLettermint()
await lettermint.email
  .from('sender@example.com')
  .to('recipient@example.com')
  .subject('Hello')
  .html('<h1>Hello</h1>')
  .tag('campaign')
  .send()
```

## Links

- [Lettermint](https://lettermint.co)
- [Lettermint Documentation](https://docs.lettermint.co)
- [Lettermint Node.js SDK](https://www.npmjs.com/package/lettermint)


<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-lettermint/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-lettermint

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-lettermint.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/nuxt-lettermint

[license-src]: https://img.shields.io/npm/l/nuxt-lettermint.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-lettermint

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
