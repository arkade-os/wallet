#!/usr/bin/env node
// Arkade wallet rescue server.
//
// Serves the offline recovery tool (arkade-recover.html) over HTTPS *at your
// wallet's domain*, so your passkey can be used to decrypt the wallet even if
// the real website is gone, seized, or compromised. Passkeys are bound to the
// domain (WebAuthn RP ID) — by pointing the domain at this machine and
// trusting a local certificate, the browser lets the recovery page run the
// passkey assertion and derive the decryption key. No network is involved.
//
// Usage:
//   sudo node serve.mjs arkade-recover.html --host arkade.money [--port 443]
//   node serve.mjs arkade-recover.html --host arkade.money --port 8443 (paste-vault mode)
//   node serve.mjs arkade-recover.html --cert my.crt --key my.key (e.g. from mkcert)
//
// Port 443 (needs sudo/admin) lets the page read the encrypted wallet straight
// from this browser profile's localStorage (same origin as the wallet). On any
// other port you must paste the vault JSON manually into the page.
//
// Steps printed at startup; remember to undo the hosts entry and remove the
// certificate trust when you are done.
import { createServer } from 'node:https'
import { execFileSync } from 'node:child_process'
import { readFileSync, mkdtempSync, existsSync } from 'node:fs'
import { tmpdir, platform } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const positional = []
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--'))
    i++ // skip the flag's value too
  else positional.push(args[i])
}
const file = positional[0] ?? 'arkade-recover.html'
const host = opt('host', 'arkade.money')
const port = Number(opt('port', '443'))

if (!existsSync(file)) {
  console.error(`Cannot find ${file} — run this script next to your downloaded recovery tool.`)
  process.exit(1)
}
const html = readFileSync(file)

let certPath = opt('cert', '')
let keyPath = opt('key', '')
if (!certPath || !keyPath) {
  const dir = mkdtempSync(join(tmpdir(), 'arkade-rescue-'))
  certPath = join(dir, 'cert.pem')
  keyPath = join(dir, 'key.pem')
  try {
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'ec',
        '-pkeyopt',
        'ec_paramgen_curve:prime256v1',
        '-keyout',
        keyPath,
        '-out',
        certPath,
        '-days',
        '7',
        '-nodes',
        '-subj',
        `/CN=${host}`,
        '-addext',
        `subjectAltName=DNS:${host}`,
      ],
      { stdio: ['ignore', 'ignore', 'inherit'] },
    )
  } catch {
    console.error('openssl not found. Install it, or pass --cert/--key (mkcert works great: `mkcert ' + host + '`).')
    process.exit(1)
  }
}

const server = createServer({ cert: readFileSync(certPath), key: readFileSync(keyPath) }, (req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
  res.end(html)
})

server.listen(port, '127.0.0.1', () => {
  const url = 'https:' + '//' + host + (port === 443 ? '' : `:${port}`)
  const hostsLine = `127.0.0.1 ${host}`
  const hostsFile = platform() === 'win32' ? 'C:\\Windows\\System32\\drivers\\etc\\hosts' : '/etc/hosts'
  console.log(`
Rescue server running. Do this, in order:

1. Point the domain at this machine (also blocks the real site while you recover):
     echo '${hostsLine}' | sudo tee -a ${hostsFile}

2. Trust the local certificate (${certPath}):
     macOS:  sudo security add-trusted-cert -d -k /Library/Keychains/System.keychain ${certPath}
     Linux:  sudo cp ${certPath} /usr/local/share/ca-certificates/arkade-rescue.crt && sudo update-ca-certificates
     (or skip this step by generating the cert with mkcert and passing --cert/--key)

3. Open ${url} in the SAME browser profile you used the wallet with,
   scroll to "Recover with your passkey", and unlock.

4. When done: remove the hosts line, un-trust the certificate, stop this server (Ctrl+C).
`)
})
