# Lightning addresses on the wallet's domain

A payer resolves `alice@arkade.money` at `https://arkade.money/.well-known/lnurlp/alice`, and a nameless wallet's LNURL
at `https://arkade.money/lnurl/<session id>`. Each then calls the callback lnurl-server puts on the same domain.

The zone Worker in `workers/lnurl-proxy` forwards these to lnurl-server, keeping the `Host` header as `arkade.money` so
the server answers for that domain. Its routes take precedence over the Pages app on those paths.

A Pages Function cannot do this. Cloudflare ignores `resolveOverride` from Pages, so the request loops back to Pages.

## Setup

1. **DNS, in the `arkade.money` zone:** add a proxied record for lnurl-server, `lnurl-origin.arkade.money`, as an A record
   to the server or a CNAME to it. The override only reaches a proxied hostname in the same zone.
2. **lnurl-server reverse proxy:** route `Host(arkade.money) && (PathPrefix(/.well-known/lnurlp) || PathPrefix(/lnurl))`
   to the lnurl-server service, port 3000.
   - In Dokploy, that is two domain entries for `arkade.money`, with the paths `/.well-known/lnurlp` and `/lnurl`, neither
     stripping its path.
   - These routes must not carry the admin's basic-auth middleware. Dokploy can add it to a new route.
   - Cloudflare connects to the server as `arkade.money`. Serve a Cloudflare Origin CA certificate for that name, and keep
     the zone's SSL mode at "Full (strict)" so Cloudflare verifies it.
   - Leave Let's Encrypt off for it. Its HTTP challenge would reach Pages.
3. **lnurl-server:** add the domain with `POST /admin/api/domains`, using
   `{ "domain": "arkade.money", "allocationModes": [...] }`.
4. **Worker:** deploy it from this repo. `wrangler.toml` holds its routes and `LNURL_ORIGIN`.

   ```sh
   cd workers/lnurl-proxy
   npx wrangler login    # once
   npx wrangler deploy
   ```

5. **Wallet build:** set `VITE_LNURL_DOMAIN=arkade.money`. `VITE_LNURL_SERVER` stays the lnurl-server URL.

## Check

- `curl -i https://arkade.money/.well-known/lnurlp/<name>` returns lnurl-server's JSON, and its `callback` starts with
  `https://arkade.money/.well-known/lnurlp/`.
- A nameless wallet's `curl -i https://arkade.money/lnurl/<session id>` returns the same, with a callback under
  `https://arkade.money/lnurl/`.

| Symptom | Cause |
| --- | --- |
| The wallet's HTML | The Worker's routes are missing, so Pages answered. |
| `508 LNURL origin unreachable` | The override was ignored and the request came back through the Worker. |
| `Error 1016 Origin DNS error` | The override was ignored, and the request went to `arkade.money`'s own origin. Check `LNURL_ORIGIN` against the DNS record, character for character. |
| `401` with `WWW-Authenticate: Basic realm="traefik"` | The server's route for `arkade.money` carries an authentication middleware. |
| `Unknown or disabled domain` | lnurl-server does not have the domain, or the `Host` header was rewritten on the way. |
