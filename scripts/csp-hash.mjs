#!/usr/bin/env node
// The CSP allows the inline theme bootstrap in index.html by hash, so any edit
// to that block (including a reformat) silently breaks it in production. Run
// with --fix to rewrite the token, without arguments to verify it.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const HEADER_FILES = ['nginx-security-headers.conf', 'public/_headers']

const html = readFileSync('index.html', 'utf8')
const match = html.match(/<script>([\s\S]*?)<\/script>/)
if (!match) {
  console.error('csp-hash: no inline <script> found in index.html')
  process.exit(1)
}

const token = `'sha256-${createHash('sha256').update(match[1], 'utf8').digest('base64')}'`
const fix = process.argv.includes('--fix')
let failed = false

for (const file of HEADER_FILES) {
  const content = readFileSync(file, 'utf8')
  if (content.includes(token)) continue
  if (fix) {
    const fixed = content.replace(/'sha256-[A-Za-z0-9+/=]+'/g, token)
    if (fixed === content) {
      console.error(`csp-hash: no sha256 token to replace in ${file}`)
      failed = true
      continue
    }
    writeFileSync(file, fixed)
    console.log(`csp-hash: updated ${file}`)
  } else {
    console.error(`csp-hash: ${file} is missing ${token} — run 'pnpm csp:fix'`)
    failed = true
  }
}

process.exit(failed ? 1 : 0)
