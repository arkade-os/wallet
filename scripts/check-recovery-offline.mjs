// Guards the offline recovery tool: public/recover.html must be a single
// self-contained file with zero network access. Fails the build if any
// external reference or network API sneaks in.
import { readFileSync } from 'node:fs'

const path = new URL('../public/recover.html', import.meta.url)
const html = readFileSync(path, 'utf8')

const violations = []

// external resources (data: URIs are fine)
for (const match of html.matchAll(/<script[^>]*\ssrc=|<link[^>]*\shref=|<img[^>]*\ssrc=/g)) {
  const snippet = html.slice(match.index, match.index + 120)
  if (!snippet.includes('data:')) violations.push(`external resource: ${snippet.slice(0, 80)}`)
}

// network APIs — none of these belong in an offline tool
for (const needle of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket(', 'EventSource(', 'import(']) {
  if (html.includes(needle)) violations.push(`network API reference: ${needle}`)
}

// absolute URLs outside of comments/licenses (allow xmlns and w3.org schema strings)
for (const match of html.matchAll(/https?:\/\/[^\s"'<)]+/g)) {
  const url = match[0]
  if (url.includes('w3.org') || url.includes('github.com') || url.includes('opensource.org')) continue
  violations.push(`hardcoded URL: ${url.slice(0, 80)}`)
}

if (!html.includes('Content-Security-Policy')) violations.push('missing CSP meta tag')

if (violations.length > 0) {
  console.error('recover.html offline check FAILED:')
  for (const v of violations) console.error(` - ${v}`)
  process.exit(1)
}

console.log(`recover.html offline check passed (${(html.length / 1024).toFixed(0)} KiB, self-contained)`)
