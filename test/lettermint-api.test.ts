import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const runtimeConfig = vi.hoisted(() => ({ apiKey: 'test-api-key', apiToken: 'test-api-token', baseUrl: '', timeout: 0 }))

vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(() => ({
    lettermint: {
      apiKey: runtimeConfig.apiKey,
      apiToken: runtimeConfig.apiToken,
      baseUrl: runtimeConfig.baseUrl,
      timeout: runtimeConfig.timeout,
    },
  })),
}))

interface CapturedRequest {
  url: string
  method: string
  headers: Record<string, string>
}

let requests: CapturedRequest[] = []

async function useApi() {
  const { useLettermintApi } = await import('../src/runtime/server/utils/lettermint')
  return useLettermintApi()
}

beforeEach(() => {
  requests = []
  runtimeConfig.apiToken = 'test-api-token'
  runtimeConfig.baseUrl = ''
  vi.resetModules()
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    requests.push({
      url: String(url),
      method: String(init.method),
      headers: (init.headers || {}) as Record<string, string>,
    })

    return {
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
      text: async () => 'pong\n',
    }
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useLettermintApi', () => {
  it('authenticates with a bearer token, not the sending token', async () => {
    await (await useApi()).team.retrieve()

    expect(requests[0]!.headers.Authorization).toBe('Bearer test-api-token')
    expect(requests[0]!.headers['x-lettermint-token']).toBeUndefined()
  })

  it('exposes the documented endpoint groups', async () => {
    const api = await useApi()

    expect(Object.keys(api).filter(key => key !== 'client').sort()).toEqual([
      'domains',
      'messages',
      'projects',
      'routes',
      'stats',
      'suppressions',
      'team',
      'webhooks',
    ])
  })

  it('reads collections', async () => {
    await (await useApi()).domains.list()

    expect(requests[0]!.method).toBe('GET')
    expect(requests[0]!.url).toBe('https://api.lettermint.co/v1/domains')
  })

  it('writes to collections', async () => {
    await (await useApi()).suppressions.create({ email: 'user@acme.com', reason: 'hard_bounce', scope: 'team' })

    expect(requests[0]!.method).toBe('POST')
    expect(requests[0]!.url).toBe('https://api.lettermint.co/v1/suppressions')
  })

  it('escapes path parameters', async () => {
    await (await useApi()).messages.retrieve('msg/../1')

    expect(requests[0]!.url).toBe('https://api.lettermint.co/v1/messages/msg%2F..%2F1')
  })

  it('returns raw text where the API returns text', async () => {
    const pong = await (await useApi()).ping()

    expect(pong).toBe('pong')
  })

  it('uses a configured base url', async () => {
    runtimeConfig.baseUrl = 'https://mail.internal.acme.com/v1'

    await (await useApi()).team.retrieve()

    expect(requests[0]!.url).toBe('https://mail.internal.acme.com/v1/team')
  })

  it('explains that the team api needs its own token', async () => {
    runtimeConfig.apiToken = ''

    await expect(useApi()).rejects.toThrow('NUXT_LETTERMINT_API_TOKEN')
  })

  it('reuses one client across calls', async () => {
    const { useLettermintApi } = await import('../src/runtime/server/utils/lettermint')

    expect(useLettermintApi()).toBe(useLettermintApi())
  })
})
