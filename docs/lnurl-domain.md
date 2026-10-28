# Lightning addresses on the wallet's domain

A payer resolves `alice@arkade.money` at `https://arkade.money/.well-known/lnurlp/alice`, and then
calls the callback lnurl-server puts on the same domain. The Pages Function in
`functions/.well-known/lnurlp/[[path]].ts` forwards both to lnurl-server. The `Host` header stays
`arkade.money`, so the server answers for that domain.

## Setup

1. **DNS, in the `arkade.money` zone:** add a proxied record for lnurl-server, for example
   `lnurl-origin.arkade.money` (CNAME or A to the server). The Function can only redirect to a
   proxied hostname in the same zone.
2. **Pages project, production environment:** set the variable `LNURL_ORIGIN=lnurl-origin.arkade.money`.
   Without it, the Function answers 404.
3. **lnurl-server reverse proxy:** route `Host(arkade.money) && PathPrefix(/.well-known/lnurlp)` to the
   lnurl-server service. Cloudflare connects to it as `arkade.money`, so:
   - Serve a Cloudflare Origin CA certificate for that name, or use SSL mode "Full", not "Full (strict)".
   - Leave Let's Encrypt off for it. Its HTTP challenge would reach Pages.
4. **lnurl-server:** add the domain with `POST /admin/api/domains`, using `{ "domain": "arkade.money", ... }`.
5. **Wallet build:** set `VITE_LNURL_DOMAIN=arkade.money`. `VITE_LNURL_SERVER` stays the lnurl-server URL.

## Check

`curl -i https://arkade.money/.well-known/lnurlp/<name>` returns lnurl-server's JSON, and its
`callback` starts with `https://arkade.money/.well-known/lnurlp/`.

A `502 LNURL origin unreachable` means Cloudflare did not apply the override and the request came
back to Pages. Check step 1. If it persists, run the same forwarding as a Worker on the route
`arkade.money/.well-known/lnurlp/*`, using `fetch(request, { cf: { resolveOverride } })`.
Cloudflare documents the override for zone Workers.
