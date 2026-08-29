# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 2.x | Yes |
| 1.x | No |

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Report it through [GitHub's private vulnerability reporting](https://github.com/lettermint/nuxt-lettermint/security/advisories/new) instead. We will confirm receipt, keep you posted while we work on a fix, and credit you in the advisory unless you would rather stay anonymous.

Useful things to include: what you can do with it, the steps to reproduce, and the version of the module you tested against.

## Handling your API keys

This module reads your Lettermint credentials from the server-side runtime config, so they stay out of the client bundle. Two things to be careful with in your own code:

- The team API token used by `useLettermintApi()` covers your entire team. Never return it, or data derived from it, through a public route.
- `/api/lettermint/send` is not registered unless you set `autoEndpoint: true`, and it has no authentication of its own. If you enable it, put your own check in front of it, see [the README](./README.md#the-auto-generated-endpoint).
