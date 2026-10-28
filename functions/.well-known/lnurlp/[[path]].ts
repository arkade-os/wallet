// Serves arkade.money's LNURLs (an address or a nameless wallet's session, and its callback) from lnurl-server.
// resolveOverride sends it to LNURL_ORIGIN, a proxied record in this zone, while Host stays this domain,
// so the server answers for it. Cloudflare ignores the override across zones, which would route back here.

interface EventContext {
  request: Request
  env: Record<string, string | undefined>
}

export const FORWARDED = 'x-arkade-lnurl-forwarded'
// Not the rest of /lnurl/: lnurl-server's API lives there too.
export const LNURL_PATH = /^\/(\.well-known\/lnurlp\/[^/]+|lnurl\/[0-9a-f]{32})(\/callback)?$/

// The wallet keeps its keys on this origin, so whatever comes back must not run, frame or set cookies here.
const SAFE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; sandbox",
  'X-Frame-Options': 'DENY',
  'Access-Control-Allow-Origin': '*',
}

export const onRequest = async ({ request, env }: EventContext): Promise<Response> => {
  const origin = env.LNURL_ORIGIN
  if (!origin || !LNURL_PATH.test(new URL(request.url).pathname)) return new Response('Not found', { status: 404 })
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET' } })
  if (request.headers.has(FORWARDED)) return new Response('LNURL origin unreachable', { status: 502 })
  const forwarded = new Request(request)
  forwarded.headers.set(FORWARDED, '1')
  forwarded.headers.delete('authorization')
  forwarded.headers.delete('cookie')
  const upstream = await fetch(forwarded, { cf: { resolveOverride: origin } } as RequestInit)
  return new Response(upstream.body, { status: upstream.status, headers: SAFE_HEADERS })
}
