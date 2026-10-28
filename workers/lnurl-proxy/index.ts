// Sends the wallet domain's payer paths to lnurl-server through resolveOverride, keeping Host so the server
// answers for that domain. Only a zone Worker can: Cloudflare ignores the override from a Pages Function.

export const FORWARDED = 'x-arkade-lnurl-forwarded'
// Not the rest of /lnurl/: lnurl-server's API lives there too.
const LNURL_PATH =/^\/(\.well-known\/lnurlp\/[^/]+|lnurl\/[0-9a-f]{32})(\/callback)?$/

// The wallet keeps its keys on this origin, so whatever comes back must not run, frame or set cookies here.
const SAFE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; sandbox",
  'X-Frame-Options': 'DENY',
  'Access-Control-Allow-Origin': '*',
}

// LNURL's error shape with CORS, so a browser payer reads the reason instead of a network error.
const refuse = (status: number, reason: string, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify({ status: 'ERROR', reason }), { status, headers: { ...SAFE_HEADERS, ...headers } })

export default {
  async fetch(request: Request, env: { LNURL_ORIGIN?: string }): Promise<Response> {
    const origin = env.LNURL_ORIGIN
    if (!origin || !LNURL_PATH.test(new URL(request.url).pathname)) return refuse(404, 'Not found')
    if (request.method !== 'GET') return refuse(405, 'Method not allowed', { Allow: 'GET' })
    // 508, not 502: Cloudflare swaps a 502 for its own page, hiding the reason.
    if (request.headers.has(FORWARDED)) return refuse(508, 'LNURL origin unreachable')
    const forwarded = new Request(request)
    forwarded.headers.set(FORWARDED, '1')
    forwarded.headers.delete('authorization')
    forwarded.headers.delete('cookie')
    const upstream = await fetch(forwarded, { cf: { resolveOverride: origin } } as RequestInit)
    return new Response(upstream.body, { status: upstream.status, headers: SAFE_HEADERS })
  },
}
