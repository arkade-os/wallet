# Lightning addresses on the wallet's domain

A payer resolves `alice@arkade.money` at `https://arkade.money/.well-known/lnurlp/alice`, and a
nameless wallet's LNURL at `https://arkade.money/lnurl/<session id>`. Each then calls the callback
lnurl-server puts on the same domain. The Pages Function in `functions/.well-known/lnurlp/[[path]].ts`
forwards these to lnurl-server; `functions/lnurl/[[path]].ts` routes the `/lnurl/` ones to it. The
`Host` header stays `arkade.money`, so the server answers for that domain.

## Setup

1. **DNS, in the `arkade.money` zone:** add a proxied record for lnurl-server, for example
   `lnurl-origin.arkade.money` (CNAME or A to the server). The Function can only redirect to a
   proxied hostname in the same zone.
2. **Pages project, production environment:** set the variable `LNURL_ORIGIN=lnurl-origin.arkade.money`.
   Without it, the Function answers 404. With `BASIC_AUTH_*` set, these paths stay public: payers
   resolve addresses without credentials, and the Function forwards no `Authorization` or `Cookie`.
3. **lnurl-server reverse proxy:** route `Host(arkade.money) && (PathPrefix(/.well-known/lnurlp) || PathPrefix(/lnurl/))`
   to the lnurl-server service. In Dokploy, that is two domain entries for `arkade.money`, with the paths
   `/.well-known/lnurlp` and `/lnurl`, neither stripping its path. Cloudflare connects to it as `arkade.money`, so:
   - Serve a Cloudflare Origin CA certificate for that name, and keep the zone's SSL mode at
     "Full (strict)" so Cloudflare verifies it.
   - Leave Let's Encrypt off for it. Its HTTP challenge would reach Pages.
4. **lnurl-server:** add the domain with `POST /admin/api/domains`, using `{ "domain": "arkade.money", ... }`.
5. **Wallet build:** set `VITE_LNURL_DOMAIN=arkade.money`. `VITE_LNURL_SERVER` stays the lnurl-server URL.

## Check

`curl -i https://arkade.money/.well-known/lnurlp/<name>` returns lnurl-server's JSON, and its
`callback` starts with `https://arkade.money/.well-known/lnurlp/`. A nameless wallet's
`curl -i https://arkade.money/lnurl/<session id>` does the same, with a callback under `https://arkade.money/lnurl/`.

A `502 LNURL origin unreachable` means Cloudflare did not apply the override and the request came
back to Pages. Check step 1. If it persists, run this Function's handler as a zone Worker on the routes
`arkade.money/.well-known/lnurlp/*` and `arkade.money/lnurl/*`. Cloudflare documents the override for
zone Workers. Give the Worker its own `LNURL_ORIGIN=lnurl-origin.arkade.money`, since it does not see the
Pages project's variables; without it, the handler answers 404:

```ts
import { onRequest } from './functions/.well-known/lnurlp/[[path]]'
export default { fetch: (request: Request, env: Record<string, string>) => onRequest({ request, env }) }
```

Reuse the handler rather than returning `fetch(request, { cf: { resolveOverride } })` directly. The handler
keeps the path check, drops `Authorization` and `Cookie`, and serves the answer with inert headers. A
direct fetch would pass upstream headers such as `Set-Cookie` to the wallet's origin.
