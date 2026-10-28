# Lightning addresses on the wallet's domain

With the wallet served at `<domain>`, a payer resolves `alice@<domain>` at `https://<domain>/.well-known/lnurlp/alice`, and
a nameless wallet's LNURL at `https://<domain>/lnurl/<session id>`. Each then calls the callback lnurl-server puts on the
same domain.

The zone Worker in `workers/lnurl-proxy` forwards these to lnurl-server, keeping the `Host` header as `<domain>` so the
server answers for that domain. Its routes take precedence over the Pages app on those paths.

A Pages Function cannot do this. Cloudflare ignores `resolveOverride` from Pages, so the request loops back to Pages.

## Setup

1. **DNS, in the `<domain>` zone:** add a proxied record for lnurl-server, for example `lnurl-origin.<domain>`, as an A
   record to the server or a CNAME to it. The override only reaches a proxied hostname in the same zone.
2. **lnurl-server reverse proxy:** route `Host(<domain>) && (PathPrefix(/.well-known/lnurlp) || PathPrefix(/lnurl))` to
   the lnurl-server service, port 3000, without stripping the path.
   - These routes must not carry an authentication middleware. A proxy manager can add one to new routes, as Dokploy's
     Security tab does.
   - Cloudflare connects to the server as `<domain>`. Serve a Cloudflare Origin CA certificate for that name, and keep
     the zone's SSL mode at "Full (strict)" so Cloudflare verifies it.
   - Leave Let's Encrypt off for it. Its HTTP challenge would reach Pages.
3. **lnurl-server:** add the domain with `POST /admin/api/domains`, using `{ "domain": "<domain>", "allocationModes": [...] }`.
4. **Worker:** deploy the code, then configure it in the Cloudflare dashboard. A deploy keeps the dashboard settings;
   `wrangler.toml` holds no deployment values.

   ```sh
   cd workers/lnurl-proxy
   npx wrangler login                        # once
   npx wrangler deploy --name <worker name>
   ```

   - Under Settings → Domains & Routes, add the routes `<domain>/.well-known/lnurlp/*` and `<domain>/lnurl/*`.
   - Under Settings → Variables and Secrets, set `LNURL_ORIGIN` to the record from step 1, exactly as named.
5. **Wallet build:** set `VITE_LNURL_DOMAIN=<domain>`. `VITE_LNURL_SERVER` stays the lnurl-server URL.

## Check

- `curl -i https://<domain>/.well-known/lnurlp/<name>` returns lnurl-server's JSON, and its `callback` starts with
  `https://<domain>/.well-known/lnurlp/`.
- A nameless wallet's `curl -i https://<domain>/lnurl/<session id>` returns the same, with a callback under
  `https://<domain>/lnurl/`.

| Symptom | Cause |
| --- | --- |
| The wallet's HTML | The Worker's routes are missing, so Pages answered. |
| `508 LNURL origin unreachable` | The override was ignored, and the request came back through the Worker. |
| `Error 1016 Origin DNS error` | The override was ignored, and the request went to `<domain>`'s own origin. Check `LNURL_ORIGIN` against the DNS record, character for character. |
| `404 Not found` on a lookup | `LNURL_ORIGIN` is not set on the Worker. |
| `401` with `WWW-Authenticate: Basic realm="traefik"` | The server's route for `<domain>` carries an authentication middleware. |
| `Unknown or disabled domain` | lnurl-server does not have the domain, or the `Host` header was rewritten on the way. |
