#!/usr/bin/env node
/**
 * Self-signed cert for the e2e relay's TLS proxy (see relay-tls.nginx.conf).
 *
 * Generated rather than committed: a checked-in private key is a key that
 * outlives the machine it was made on, and this one exists only so a localhost
 * relay can be addressed as wss://. Playwright's `ignoreHTTPSErrors` is what
 * makes the browser accept it, so it never has to be trusted anywhere.
 *
 * Idempotent — regenerates only once the existing cert is within a day of
 * expiry, so repeated `regtest:start` runs cost nothing.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DAYS = 30
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '.relay-tls')
const cert = join(dir, 'cert.pem')
const key = join(dir, 'key.pem')

const stillValid = () => {
  if (!existsSync(cert) || !existsSync(key)) return false
  try {
    // -checkend takes seconds: valid for at least one more day.
    execFileSync('openssl', ['x509', '-in', cert, '-noout', '-checkend', String(24 * 60 * 60)], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

if (stillValid()) {
  console.log('relay TLS cert: still valid, keeping it')
  process.exit(0)
}

mkdirSync(dir, { recursive: true })
execFileSync(
  'openssl',
  [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', key,
    '-out', cert,
    '-days', String(DAYS),
    '-subj', '/CN=localhost',
    // The browser matches the name it dialled, so the SAN has to carry both
    // spellings a test might use.
    '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1',
  ],
  { stdio: 'ignore' },
)
console.log(`relay TLS cert: generated in ${dir}, valid ${DAYS} days`)
