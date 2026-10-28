import { describe, expect, it, vi } from 'vitest'
import { onRequest } from '../../../functions/_middleware'

const env = { BASIC_AUTH_USERNAME: 'wallet', BASIC_AUTH_PASSWORD: 'secret' }
const run = (path: string) => {
  const next = vi.fn(async () => new Response('next'))
  return { next, res: onRequest({ request: new Request(`https://arkade.money${path}`), env, next }) }
}

describe('basic auth middleware', () => {
  it('keeps lightning address lookups public while the wallet is behind basic auth', async () => {
    const { next, res } = run('/.well-known/lnurlp/alice/callback')

    expect((await res).status).toBe(200)
    expect(next).toHaveBeenCalled()
  })

  it('still challenges every other path', async () => {
    const { next, res } = run('/')

    expect((await res).status).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })
})
