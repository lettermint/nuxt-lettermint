# Upgrade to v2

v2 moves the module onto v2 of the [Lettermint Node.js SDK](https://github.com/lettermint/lettermint-node), and takes the chance to close a hole in the defaults.

The signatures you already use — the `lettermint` config block, `useLettermint()`, `sendEmail()` — have not changed. Projects that send from server code can upgrade without touching anything. Projects that send **from the browser** need one config line, described first below.

## Behaviour changes

### `/api/lettermint/send` is no longer registered by default

`autoEndpoint` now defaults to `false`. The route has no authentication of its own, so every app that installed the module was publishing an endpoint that anyone who could reach the site could send mail through — from your domain, against your quota. That is now something you switch on deliberately:

```ts
// nuxt.config.ts
lettermint: {
  autoEndpoint: true,
}
```

This only affects sending **from the browser**. Server-side `sendEmail()` and `sendEmails()` never went through the endpoint and are unaffected.

If you do switch it on, guard it — a session check, an API key, a rate limit — and keep `from` and `to` out of the request body where you can. The README has an example under [The Auto-Generated Endpoint](./README.md#the-auto-generated-endpoint).

If you already send through a route of your own, point the composable at it:

```ts
const { send } = useLettermint({ endpoint: '/api/contact' })
```

Without either, `send()` returns `{ success: false, error }` explaining which of the two you need, and posts nothing. Before v2 it would post to the missing route, get Nuxt's HTML fallback back with a 200, and hand you that as if it were a result.

### Arrays of recipients now reach everyone

`to`, `cc`, `bcc` and `replyTo` were handed to the SDK one address at a time, and the SDK replaces the recipient list on every call instead of appending to it. Only the **last** address of an array was actually sent:

```ts
await sendEmail({
  from: 'hello@acme.com',
  to: ['first@acme.com', 'second@acme.com'], // v1 delivered to second@acme.com only
  subject: 'Hello',
  text: 'Hi',
})
```

From v2 the whole array is delivered to. If you pass arrays anywhere, expect more mail to go out than before — check that the extra addresses are ones you meant to reach, and that your sending volume has room for them.

### `tags: string[]` uses the first entry, not the last

The Lettermint API takes a single `tag` per message. The module used to call the SDK once per entry, so the last one won. It now uses the first:

```ts
tags: ['welcome', 'onboarding'] // v1 sent "onboarding", v2 sends "welcome"
```

If you were relying on the old behaviour, pass the tag you want as the only entry. To attach several tags, use the key/value form the API added in SDK 2.3.0:

```ts
tags: [
  { name: 'campaign', value: 'welcome' },
  { name: 'audience', value: 'trial' },
]
```

## If you use the SDK directly

The module now depends on `lettermint@^2`. If your app also has `lettermint` in its own `package.json`, upgrade it in the same step and follow the [SDK upgrade guide](https://github.com/lettermint/lettermint-node/blob/main/UPGRADE.md) — v2 changes how clients are constructed and how tokens are configured.

Code that goes through `useLettermint()` keeps working as it is:

```ts
const lettermint = useLettermint()
await lettermint.email.from('hello@acme.com').to('user@acme.com').subject('Hello').send()
```

## TypeScript

`LettermintSendResponse.status` used to be `'pending' | 'sent' | 'failed'`. It now uses the SDK's `MessageStatus`, which covers all fourteen statuses the API can return (`queued`, `delivered`, `opened`, `hard_bounced`, and so on). An exhaustive `switch` or a comparison against a status that no longer exists will fail to compile until you widen it.

## Fixed

Concurrent sends could bleed into each other. The module kept one SDK instance, and its email builder holds the message being composed as instance state, so two requests building a message at the same time could overwrite each other's recipients or subject. Each send now builds its own message. `useLettermint()` still returns the shared instance.

## New

### Batch sending

`sendEmails()` sends several messages in one request, with the results in the order you passed them:

```ts
await sendEmails(messages, { idempotencyKey: `digest-${week}` })
```

### The team API

`useLettermintApi()` exposes domains, messages, projects, routes, stats, suppressions, team and webhooks. It authenticates with a **team API token**, a different credential from the project sending key, so it needs its own configuration:

```ts
// nuxt.config.ts — or NUXT_LETTERMINT_API_TOKEN
lettermint: {
  apiToken: 'your-team-api-token',
}
```

Server-side only: the token covers your whole team.

### New options

`sendEmail()` accepts a few extra fields, all optional:

| Option | Description |
| --- | --- |
| `settings` | `trackOpens`, `trackClicks` and the `tls` policy, per message. |
| `route` | Send through a specific route instead of the project default. |
| `idempotencyKey` | Reuse across retries of the same send so the message is only delivered once. |
| `attachments[].contentType` | MIME type of the attachment. The module accepted this before but dropped it. |
| `attachments[].contentId` | Reference the attachment from the HTML body (inline attachment). |
| `tags` as `{ name, value }[]` | Key/value tags, as added in SDK 2.3.0. |

And two module options, both matching what the SDK client accepts: `baseUrl` and `timeout` (`NUXT_LETTERMINT_BASE_URL`, `NUXT_LETTERMINT_TIMEOUT`).
