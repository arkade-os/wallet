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

// Only the script-src directive of the header itself is ours to touch: matching
// the whole file would accept a stale hash sitting in a comment (both files
// mention script-src in one), and rewriting it would clobber the hashes of any
// other directive. \s rules out script-src-attr.
const SCRIPT_SRC = /script-src\s[^";]*/
const isHeader = (line) => !line.trim().startsWith('#') && line.includes('Content-Security-Policy')

for (const file of HEADER_FILES) {
  const lines = readFileSync(file, 'utf8').split('\n')
  const index = lines.findIndex((line) => isHeader(line) && SCRIPT_SRC.test(line))
  if (index === -1) {
    console.error(`csp-hash: no script-src directive in ${file}`)
    failed = true
    continue
  }
  const directive = lines[index].match(SCRIPT_SRC)[0]
  if (directive.includes(token)) continue
  if (fix) {
    const fixed = directive.replace(/'sha256-[A-Za-z0-9+/=]+'/g, token)
    if (fixed === directive) {
      console.error(`csp-hash: no sha256 token to replace in ${file}`)
      failed = true
      continue
    }
    lines[index] = lines[index].replace(SCRIPT_SRC, () => fixed)
    writeFileSync(file, lines.join('\n'))
    console.log(`csp-hash: updated ${file}`)
  } else {
    console.error(`csp-hash: ${file} is missing ${token} in script-src — run 'pnpm csp:fix'`)
    failed = true
  }
}

process.exit(failed ? 1 : 0)
