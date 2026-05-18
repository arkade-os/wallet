// Cloudflare Pages edge middleware for optional HTTP basic auth.
// Runs before every request when deployed to Cloudflare Pages.
//   https://developers.cloudflare.com/pages/functions/middleware/
//
// To enable, set BASIC_AUTH_USERNAME and BASIC_AUTH_PASSWORD as environment
// variables in the Cloudflare Pages dashboard. When either is unset,
// requests pass through without authentication.
//
// See also: plugins/vite-plugin-basic-auth.ts for the dev server equivalent.

function unauthorized() {
  return new Response('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Restricted"' },
  })
}

export const onRequest: PagesFunction = async (context) => {
  const username = (context.env as Record<string, string>).BASIC_AUTH_USERNAME
  const password = (context.env as Record<string, string>).BASIC_AUTH_PASSWORD

  if (!username || !password) return context.next()

  const auth = context.request.headers.get('Authorization')
  if (!auth) return unauthorized()

  const expected = 'Basic ' + btoa(`${username}:${password}`)
  if (auth !== expected) return unauthorized()

  return context.next()
}
