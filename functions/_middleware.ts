// Cloudflare Pages edge middleware for optional HTTP basic auth.
// Runs before every request when deployed to Cloudflare Pages.
//   https://developers.cloudflare.com/pages/functions/middleware/
//
// To enable, set BASIC_AUTH_USERNAME and BASIC_AUTH_PASSWORD as environment
// variables in the Cloudflare Pages dashboard. When either is unset,
// requests pass through without authentication.
//
// See also: plugins/vite-plugin-basic-auth.ts for the dev server equivalent.

interface EventContext {
  request: Request
  env: Record<string, string>
  next: () => Promise<Response>
}

function unauthorized() {
  return new Response('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Restricted"' },
  })
}

export const onRequest = async (context: EventContext) => {
  const username = context.env.BASIC_AUTH_USERNAME
  const password = context.env.BASIC_AUTH_PASSWORD

  if (!username || !password) return context.next()

  const auth = context.request.headers.get('Authorization')
  if (!auth) return unauthorized()

  const encoder = new TextEncoder()
  const expected = encoder.encode('Basic ' + btoa(`${username}:${password}`))
  const actual = encoder.encode(auth)
  // @ts-expect-error Cloudflare runtime extension is not part of SubtleCrypto typings.
  if (actual.byteLength !== expected.byteLength || !crypto.subtle.timingSafeEqual(expected, actual))
    return unauthorized()

  return context.next()
}
