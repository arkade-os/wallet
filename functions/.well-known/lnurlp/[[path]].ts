// Serves arkade.money/.well-known/lnurlp/* (an address lookup and its callback) from lnurl-server.
// resolveOverride sends it to LNURL_ORIGIN, a proxied record in this zone, while Host stays this domain,
// so the server answers for it. Cloudflare ignores the override across zones, which would route back here.

interface EventContext {
  request: Request
  env: Record<string, string | undefined>
}

export const FORWARDED = 'x-arkade-lnurl-forwarded'

export const onRequest = async ({ request, env }: EventContext): Promise<Response> => {
  const origin = env.LNURL_ORIGIN
  if (!origin) return new Response('Not found', { status: 404 })
  if (request.headers.has(FORWARDED)) return new Response('LNURL origin unreachable', { status: 502 })
  const forwarded = new Request(request)
  forwarded.headers.set(FORWARDED, '1')
  return fetch(forwarded, { cf: { resolveOverride: origin } } as RequestInit)
}
