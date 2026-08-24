![Nuxt Lettermint](https://lettermint.co/images/nuxt-lettermint.png)

# Nuxt Lettermint Module

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]
[![Join our Discord server](https://img.shields.io/discord/1305510095588819035?logo=discord&logoColor=eee&label=Discord&labelColor=464ce5&color=0D0E28&cacheSeconds=43200)](https://lettermint.co/r/discord)

A Nuxt module for sending emails using the [Lettermint](https://lettermint.co) email service. This module provides a seamless integration with Lettermint's Node.js SDK for both server-side and client-side email sending capabilities.

Lettermint is a European transactional email service provider focused on simplicity, reliability, and developer experience. Visit [Lettermint.co](https://lettermint.co) for more information about our email platform.

Upgrading from v1? See [UPGRADE.md](./UPGRADE.md).

## Features

- 🚀 Full TypeScript support
- 🔒 Secure API key management
- 📧 Simple composable for client-side usage
- 📦 Batch sending
- 🛠️ Direct server-side SDK access, including the team API
- ⚙️ Flexible configuration via environment variables or `nuxt.config.ts`
- 🎯 Compatible with Nuxt 3 and Nuxt 4

## Quick Setup

### 1. Install the module

Using the Nuxt CLI (recommended):

```bash
npx nuxi module add lettermint
```

Or install manually:

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

First, get your API key from Lettermint:
1. Go to [https://dash.lettermint.co/projects](https://dash.lettermint.co/projects)
2. Select your project
3. Find your API token

Then set your API key in one of two ways:

**Option A:** Create a `.env` file in your project root (recommended):

```bash
NUXT_LETTERMINT_API_KEY=your-lettermint-api-key
```

**Option B:** Add it directly to your `nuxt.config.ts`:

```javascript
export default defineNuxtConfig({
  modules: ['nuxt-lettermint'],
  lettermint: {
    apiKey: 'your-api-key'
  }
})
```

## Configuration

The module accepts the following configuration options:

```typescript
export default defineNuxtConfig({
  modules: ['nuxt-lettermint'],
  lettermint: {
    // Your project sending token (see step 3 above for configuration options)
    apiKey: 'your-api-key',

    // Team API token, only needed for useLettermintApi(). Server-side only.
    apiToken: 'your-team-api-token',

    // Enable/disable the auto-generated /api/lettermint/send endpoint (default: true)
    // Set to false if you want to create your own custom endpoints
    autoEndpoint: true,

    // Override the API base URL and request timeout in ms
    baseUrl: 'https://api.lettermint.co/v1',
    timeout: 30000
  }
})
```

Every option has an environment variable equivalent: `NUXT_LETTERMINT_API_KEY`, `NUXT_LETTERMINT_API_TOKEN`, `NUXT_LETTERMINT_BASE_URL` and `NUXT_LETTERMINT_TIMEOUT`.

### Disabling the Auto-Generated Endpoint

By default, the module creates an endpoint at `/api/lettermint/send` for sending emails. If you prefer to create your own custom endpoints, you can disable this behavior:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-lettermint'],
  lettermint: {
    autoEndpoint: false
  }
})
```

**Note:** When you disable the auto-generated endpoint:
- You can still send emails directly from your server code using the `sendEmail` function
- The client-side `useLettermint()` composable will not work unless you create a custom endpoint at `/api/lettermint/send`
- Only create a custom endpoint if you need specific routing, additional logic, or client-side email sending:

```typescript
// server/api/custom-send.post.ts (optional)
import { sendEmail } from '#imports'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  // Add your custom logic here
  return await sendEmail(body)
})
```

## Usage

### Client-Side

```vue
<script setup>
const { send, sending, error } = useLettermint()

await send({
  from: 'sender@example.com',
  to: 'ok@testing.lettermint.co',
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
    to: 'ok@testing.lettermint.co',
    subject: 'Welcome',
    html: '<h1>Welcome!</h1>',
    tags: ['welcome']
  })
})
```

#### Email options

`sendEmail()` and the `send()` returned by `useLettermint()` take the same options:

| Option | Type | Description |
| --- | --- | --- |
| `from` | `string` | Sender address, optionally as `Name <address>`. Required. |
| `to` | `string \| string[]` | Recipients. Required. |
| `subject` | `string` | Required. |
| `text` | `string` | Plain text body. Provide `text`, `html`, or both. |
| `html` | `string` | HTML body. |
| `cc` | `string \| string[]` | |
| `bcc` | `string \| string[]` | |
| `replyTo` | `string \| string[]` | |
| `headers` | `Record<string, string>` | Custom headers. |
| `metadata` | `Record<string, unknown>` | Returned on the message and in webhooks. |
| `tags` | `string[] \| { name, value }[]` | A single tag (a `string[]` uses its first entry), or key/value tags. |
| `attachments` | `Array<{ filename, content, contentType?, contentId? }>` | `content` is base64 or a `Buffer`. Set `contentId` to reference the file from the HTML body. |
| `settings` | `{ trackOpens?, trackClicks?, tls? }` | Per-message overrides. `tls` is `opportunistic` or `enforced`. |
| `route` | `string` | Send through a specific route instead of the project default. |
| `idempotencyKey` | `string` | Reuse across retries so the message is only delivered once. |

```typescript
await sendEmail({
  from: 'Acme <hello@example.com>',
  to: ['ok@testing.lettermint.co', 'second@testing.lettermint.co'],
  subject: 'Your invoice',
  html: '<h1>Invoice</h1><img src="cid:logo">',
  attachments: [
    { filename: 'invoice.pdf', content: pdfBuffer, contentType: 'application/pdf' },
    { filename: 'logo.png', content: logoBuffer, contentId: 'logo' },
  ],
  idempotencyKey: `invoice-${invoice.id}`,
})
```

### Batch Sending

`sendEmails()` puts every message in a single request. Each one is accepted or rejected on its own, and the results come back in the order you passed them.

```typescript
// server/api/notify.post.ts
import { sendEmails } from '#imports'

export default defineEventHandler(async () => {
  return await sendEmails(
    subscribers.map(subscriber => ({
      from: 'hello@example.com',
      to: subscriber.email,
      subject: 'Your weekly digest',
      html: renderDigest(subscriber),
    })),
    { idempotencyKey: `digest-${week}` },
  )
})
```

### Team API

`useLettermintApi()` exposes the rest of the Lettermint API: domains, messages, projects, routes, stats, suppressions, team and webhooks. It needs a **team API token**, which is a different credential from your project sending key — create one in your team settings and set `NUXT_LETTERMINT_API_TOKEN`.

Keep this server-side. The token grants access to your whole team, so never expose it through a public endpoint.

```typescript
// server/api/deliverability.get.ts
import { useLettermintApi } from '#imports'

export default defineEventHandler(async () => {
  const api = useLettermintApi()

  const [stats, suppressions] = await Promise.all([
    api.stats.retrieve({ start: '2026-01-01', end: '2026-01-31' }),
    api.suppressions.list(),
  ])

  return { stats, suppressions }
})
```

### Advanced Usage

`useLettermint()` returns the SDK instance itself, for anything the helpers above don't cover:

```typescript
import { useLettermint } from '#imports'

const lettermint = useLettermint()
await lettermint.email
  .from('sender@example.com')
  .to('ok@testing.lettermint.co')
  .subject('Hello')
  .html('<h1>Hello</h1>')
  .tag('campaign')
  .send()

// Check that the credentials work
await lettermint.email.ping()
```

## Links

- [Lettermint](https://lettermint.co)
- [Lettermint Documentation](https://docs.lettermint.co)
- [Lettermint Node.js SDK](https://www.npmjs.com/package/lettermint)

## License

[MIT License](./LICENSE) © 2025 Lettermint

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-lettermint/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-lettermint

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-lettermint.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/nuxt-lettermint

[license-src]: https://img.shields.io/npm/l/nuxt-lettermint.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-lettermint

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
