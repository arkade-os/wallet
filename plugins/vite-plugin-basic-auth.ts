// Vite plugin for optional HTTP basic auth on the dev and preview servers.
// To enable, set BASIC_AUTH_USERNAME and BASIC_AUTH_PASSWORD environment
// variables. When either is unset, the plugin is a no-op.
//
// See also: functions/_middleware.ts for the Cloudflare Pages production equivalent.

import type { Plugin, Connect } from 'vite'

function basicAuthMiddleware(
  username: string,
  password: string
): Connect.NextHandleFunction {
  const expected =
    'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')

  return (req, res, next) => {
    const auth = req.headers.authorization
    if (auth === expected) {
      next()
      return
    }

    res.statusCode = 401
    res.setHeader('WWW-Authenticate', 'Basic realm="Restricted"')
    res.end('Unauthorized')
  }
}

export default function basicAuth(): Plugin {
  const username = process.env.BASIC_AUTH_USERNAME
  const password = process.env.BASIC_AUTH_PASSWORD

  if (!username || !password) {
    return { name: 'vite-plugin-basic-auth' }
  }

  return {
    name: 'vite-plugin-basic-auth',
    configureServer(server) {
      server.middlewares.use(basicAuthMiddleware(username, password))
    },
    configurePreviewServer(server) {
      server.middlewares.use(basicAuthMiddleware(username, password))
    },
  }
}
