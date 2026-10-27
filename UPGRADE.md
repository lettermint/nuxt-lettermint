# Upgrade to v3

v3 moves the module onto v3 of the [Lettermint Node.js SDK](https://github.com/lettermint/lettermint-node). SDK 2.x no longer receives updates, including fixes.

The module's own surface has not changed: the `lettermint` config block and its environment variables (`NUXT_LETTERMINT_API_KEY` and so on), the client-side `useLettermint()` composable, `sendEmail()`, `sendEmails()`, the request and response of `/api/lettermint/send`, `toLettermintFailure()` and `LettermintPayloadError`. Projects that only use those can upgrade without touching their code, apart from the TypeScript note on `SendEmailResponse` below.

It is a major version because three helpers hand out SDK objects as they are, and those changed with the SDK: `useLettermint()` and `useLettermintApi()` on the server, and `useLettermintEmail()`. So did the SDK's error classes, which the module re-exports.

## The SDK client: `useLettermint()` and `useLettermintApi()`

Both return the SDK 3 client. Sending moved from `email` to `emails`:

```ts
// v2
await useLettermint().email.from('hello@acme.com').to('user@acme.com').subject('Hello').text('Hi').send()

// v3: a builder per message...
await useLettermint().emails.compose().from('hello@acme.com').to('user@acme.com').subject('Hello').text('Hi').send()

// ...or the message as a plain object, in the API's field names
await useLettermint().emails.send({ from: 'hello@acme.com', to: ['user@acme.com'], subject: 'Hello', text: 'Hi' })
```

The client now carries every credential you configured, and each part uses its own: `emails.*` the sending key, the team API the team token. Neither falls back to the other. `useLettermint()` still requires the sending key and `useLettermintApi()` the team token; the difference is that the client from `useLettermint()` can now reach the team API too when `apiToken` is set, and the one from `useLettermintApi()` can send when `apiKey` is set.

The team API takes typed query objects instead of bracketed strings, and some methods moved:

```ts
// v2
await api.domains.list({ 'page[size]': '10', 'filter[status]': 'verified' })
await api.projects.routes(projectId)
await api.team.members()

// v3
await api.domains.list({ page: { size: 10 }, filter: { status: 'verified' } })
await api.routes.list(projectId)
await api.team.members.list()
```

Message and event lists are flat pages: read `page.next_cursor` instead of `page.meta.next_cursor`, or let `iterate()` follow the pages. The SDK's [upgrade guide](https://github.com/lettermint/lettermint-node/blob/main/UPGRADE.md#team-api) maps every method. The type is `Lettermint` (from `lettermint`) where it was `ApiClient`.

## The email builder: `useLettermintEmail()`

The builder is now immutable. Every setter returns a new builder and leaves the one you called it on unchanged. A chain works as before; a message built over several statements has to keep what each setter returns, or the setters are lost:

```ts
// v2
const email = useLettermintEmail().from('hello@acme.com').to(user.email).subject('Your invoice')
if (user.accountant) email.cc(user.accountant)
await email.html(invoiceHtml).send()

// v3
let email = useLettermintEmail().from('hello@acme.com').to(user.email).subject('Your invoice')
if (user.accountant) email = email.cc(user.accountant)
await email.html(invoiceHtml).send()
```

The idempotency key moved to `send()`, and attachments take an object. `content` may now be a `Buffer` as it is:

| v2 | v3 |
| --- | --- |
| `.idempotencyKey(key).send()` | `.send({ idempotencyKey: key })` |
| `.attach(filename, base64, contentId, contentType)` | `.attach({ filename, content, contentType, contentId })` |
| `.sendBatch(messages)` | `sendEmails(messages)`, or `useLettermint().emails.sendBatch(messages)` |
| `.ping()` | `useLettermint().emails.ping()` |

The type is `EmailBuilder` where it was `EmailEndpoint`. In exchange, a base builder can be shared safely, even between concurrent requests.

## Errors

The SDK replaced its error classes, and the re-exports follow:

| v2 | v3 |
| --- | --- |
| `LettermintError` | `LettermintError`, still the base of every SDK error |
| `LettermintValidationError` (422) | `LettermintValidationError`, still 422, with field errors in `errors` |
| `LettermintTimeoutError` | `LettermintTimeoutError` |
| `LettermintHttpRequestError` | `LettermintApiError`. The old name still works as an alias, but is deprecated. |
| `LettermintClientError` (400) | Removed. A 400 is a `LettermintApiError` with `status` 400. |

New: `LettermintAuthenticationError` (401), `LettermintPermissionError` (403), `LettermintNotFoundError` (404), `LettermintConflictError` (409), `LettermintRateLimitError` (429, with `retryAfter`), `LettermintServerError` (5xx), `LettermintConnectionError`, `LettermintUnexpectedResponseError`, `LettermintRedirectError` and `LettermintConfigError`. The README lists when each one is thrown.

The properties were renamed: `statusCode` is `status`, `responseBody` is `body`, and `errorType` is `code`. `error.name` is now readable (`ValidationError`, not a minified `d`).

The SDK has a class of its own called `LettermintValidationError`, for input it refuses before sending (such as malformed tags). That is not the module's `LettermintValidationError`, which stays the 422. `sendEmail()` and `sendEmails()` turn the SDK's into a `LettermintPayloadError`, like the module's own input checks.

### What the endpoint and `toLettermintFailure()` answer

Nearly everything answers as before. The differences:

- Tags the SDK refuses (a name with spaces, a duplicate name, more than 20) answer **400** with the reason. In v2 the SDK refused them with a plain `TypeError`, which the endpoint answered as a 500.
- A timeout still answers 504, but the message now reads `The request to the Lettermint API timed out after 30000 ms.` instead of `Request timeout after 30000ms`.
- A misconfigured client (an invalid `baseUrl`, say) answers a generic 500 and logs the reason, as any other server-side failure did.
- `toLettermintFailure()` now covers failures the SDK used to leave to the runtime: an unreachable API is a 502 (`data.cause` has the reason), an answer that is not JSON is a 502, input the SDK refused is a 400, and a misconfigured client is a 500 with a generic message. v2 returned `null` for those. It no longer recognises errors thrown by SDK 2.x.

## TypeScript

`SendEmailResponse` is the SDK's `SendMailResponse`, a union on `status` (`'pending'` or `'scheduled'`). `scheduled_at` exists only on the scheduled side, so narrow first:

```ts
const result = await sendEmail(message)

if (result.status === 'scheduled') {
  console.log(result.scheduled_at)
}
```

`MessageStatus` and `TlsPolicy` are open: they accept values the API adds later, so a `switch` over them needs a `default` branch.

## If you use the SDK directly

The module now depends on `lettermint@^3`. If your app also has `lettermint` in its own `package.json`, upgrade it in the same step and follow the SDK's [upgrade guide](https://github.com/lettermint/lettermint-node/blob/main/UPGRADE.md). SDK 3 runs on Node.js 20 or later; the module already requires 22.19 or later.

The module does not verify webhooks. If your app does, with the SDK's `Webhook` class: `verify()` is now `async` and takes the raw body first, `await new Webhook(secret).verify(rawBody, headers)`, and both the `X-Lettermint-Signature` and `X-Lettermint-Delivery` headers are required. In a Nitro route, read the body with `readRawBody(event)` and pass `getHeaders(event)`.

The environment variable names stay the module's own: `NUXT_LETTERMINT_API_KEY` for the project sending token (the SDK's documentation calls it `LETTERMINT_PROJECT_TOKEN`) and `NUXT_LETTERMINT_API_TOKEN` for the team token.

# Upgrade to v2

v2 moves the module onto v2 of the [Lettermint Node.js SDK](https://github.com/lettermint/lettermint-node), and takes the chance to close a hole in the defaults.

The signatures you already use (the `lettermint` config block, `useLettermint()`, `sendEmail()`) have not changed. Projects that send from server code can upgrade without touching anything. Projects that send **from the browser** need one config line, described first below.

## Behaviour changes

### Nuxt 3 is no longer supported

v2 requires Nuxt 4 (and the Node versions Nuxt 4 supports: 22.19+, 24.11+ or 26+). A Nuxt 3 project fails at build time with a module compatibility error. Stay on v1 for Nuxt 3.

### `/api/lettermint/send` is no longer registered by default

`autoEndpoint` now defaults to `false`. The route has no authentication of its own, so every app that installed the module was publishing an endpoint that anyone who could reach the site could send mail through, from your domain and against your quota. That is now something you switch on deliberately:

```ts
// nuxt.config.ts
lettermint: {
  autoEndpoint: true,
}
```

This only affects sending **from the browser**. Server-side `sendEmail()` and `sendEmails()` never went through the endpoint and are unaffected.

If you do switch it on, guard it with a session check, an API key or a rate limit, and keep `from` and `to` out of the request body where you can. The README has an example under [The Auto-Generated Endpoint](./README.md#the-auto-generated-endpoint).

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

From v2 the whole array is delivered to. If you pass arrays anywhere, expect more mail to go out than before. Check that the extra addresses are ones you meant to reach, and that your sending volume has room for them.

### `tags` is split into `tag` and `tags`

The API has two tag fields, and the module now mirrors them instead of fusing both into one option. A plain label goes in `tag`; key/value tags (added in SDK 2.3.0) go in `tags`:

```ts
tag: 'welcome',
tags: [
  { name: 'campaign', value: 'welcome' },
  { name: 'audience', value: 'trial' },
]
```

A v1-style `tags: string[]` is refused with an error rather than silently reduced to one entry (v1 sent only the last entry; nothing else was ever delivered). Move the label you want into `tag`.

### `metadata` values must be primitives

v1 forwarded whatever `metadata` held, objects included, and the API stored what it could. v2 sends string, number and boolean values as strings, drops `null` and `undefined` entries, and refuses object or array values with an error instead of sending garbage. Flatten nested data before passing it.

## If you use the SDK directly

The module now depends on `lettermint@^2`. If your app also has `lettermint` in its own `package.json`, upgrade it in the same step and follow the [SDK upgrade guide](https://github.com/lettermint/lettermint-node/blob/main/UPGRADE.md): v2 changes how clients are constructed and how tokens are configured.

Code that goes through `useLettermint()` keeps working as it is:

```ts
const lettermint = useLettermint()
await lettermint.email.from('hello@acme.com').to('user@acme.com').subject('Hello').send()
```

## TypeScript

`LettermintError` is now the SDK's error class rather than an interface of our own describing a status and a message. Nothing used the interface, and keeping both under one name made the package export ambiguous. For a status and a message, call `toLettermintFailure()`.

`LettermintEmailAddress` is gone. It described a `{ email, name }` recipient, which no version of the module ever accepted: recipients have always been strings, optionally in `Name <address>` form. Write `'Acme <hello@acme.com>'` instead.

`LettermintSendResponse` is now an alias of the SDK's own send result, and its `status` uses the SDK's `MessageStatus` instead of `'pending' | 'sent' | 'failed'`, covering every status the API can return (`queued`, `delivered`, `opened`, `hard_bounced`, `scheduled`, and so on). An exhaustive `switch` or a comparison against a status that no longer exists will fail to compile until you widen it.

`LettermintApiResponse`, the type the endpoint answers and `useLettermint().send()` resolves to, is now a discriminated union on `success`: the failure arm always carries `error`, and narrowing on `success` gives you the right fields on each side.

## Fixed

Concurrent sends could bleed into each other. The module kept one SDK instance, and its email builder holds the message being composed as instance state, so two requests building a message at the same time could overwrite each other's recipients or subject. Each send now builds its own message, and `useLettermint()` hands out a fresh instance per call rather than a shared one. Take one where you need it; there is no instance to hold on to.

## Error responses

`/api/lettermint/send` translates SDK errors more carefully. A request that times out now answers **504** instead of 500, an error the API reports under an `error` key is passed on instead of being flattened to "Failed to send email", and the branch that looked for an axios-shaped `error.response` is gone, since the SDK never produced one.

The detail moved from the HTTP reason phrase into the body: read `message` (and `data`, which carries the API's full error body, such as field-level validation detail) instead of `statusMessage`. Two classes of failure changed status code, both because they are the server's problem rather than the caller's: an unreachable Lettermint API answers **502** instead of a misleading 400, and an upstream 401/403 (a wrong `apiKey`) also answers **502** instead of replaying the auth status into your app. Configuration detail is logged on the server, not sent to the client.

If you catch errors yourself, the SDK's error classes are now re-exported under prefixed names (`LettermintValidationError`, `LettermintTimeoutError`, and so on), together with `toLettermintFailure()`, which turns an SDK error into a status and a message. Both are documented in the README under [Error handling](./README.md#error-handling). Types are exported from the package itself (`import type { LettermintEmailOptions } from 'nuxt-lettermint'`), because Nuxt's server auto-imports carry values and not types. Reaching for `lettermint` in your own `package.json` to get at those classes is no longer necessary.

Note that the SDK ships minified, so `error.name` reads as a mangled class name (`d`, `y`) rather than `ValidationError`. Match on the classes, not on the name.

## New

### Batch sending

`sendEmails()` sends several messages in one request, with the results in the order you passed them:

```ts
await sendEmails(messages, { idempotencyKey: `digest-${week}` })
```

### The team API

`useLettermintApi()` exposes domains, messages, projects, routes, stats, suppressions, team and webhooks. It authenticates with a **team API token**, a different credential from the project sending key, so it needs its own configuration:

```ts
// nuxt.config.ts, or NUXT_LETTERMINT_API_TOKEN
lettermint: {
  apiToken: 'your-team-api-token',
}
```

Server-side only: the token covers your whole team.

### New options

`sendEmail()` accepts a few extra fields, all optional:

| Option | Description |
| --- | --- |
| `scheduledAt` | Deliver at this time instead of immediately, as a `Date` or an ISO 8601 string with a timezone, at most 30 days ahead (SDK 2.4.0). |
| `settings` | `trackOpens`, `trackClicks` and the `tls` policy, per message. |
| `route` | Send through a specific route instead of the project default. |
| `idempotencyKey` | Reuse across retries of the same send so the message is only delivered once. |
| `attachments[].contentType` | MIME type of the attachment. The module accepted this before but dropped it. |
| `attachments[].contentId` | Reference the attachment from the HTML body (inline attachment). |
| `tags` | Key/value tags, as added in SDK 2.3.0. See the `tag`/`tags` split above. |

And two module options, both matching what the SDK client accepts: `baseUrl` and `timeout` (`NUXT_LETTERMINT_BASE_URL`, `NUXT_LETTERMINT_TIMEOUT`).
