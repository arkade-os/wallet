#!/usr/bin/env node
/**
 * Is the Lightning-send solver reachable right now?
 *
 *   node scripts/probe-rfq-solver.mjs
 *
 * When a Lightning send fails there are two very different causes and the
 * wallet cannot tell them apart from the outside: our own framing could be
 * wrong, or the solver could simply not be listening. This answers that in one
 * shot, without spending an invoice.
 *
 * It sends a real `rfq_request` carrying a deliberately undecodable invoice.
 * The solver's ingress answers EVERY well-formed request, so a structured
 * `rfq_refusal` coming back is proof that the whole path works end to end:
 * relay, kind, `p` tag, NIP-44 sealing, and the request schema. It does NOT
 * prove the quote path — that needs a real invoice and a funded solver.
 *
 * Raw NIP-01 on purpose. A pooled client dedups, reconnects and swallows
 * close reasons, which is exactly the information a diagnostic must not lose.
 *
 * Reads the solver's pubkey and relays from the bundled card, so it probes
 * whatever the wallet would actually address. Pass a relay URL as the first
 * argument to override it.
 *
 * Needs direct outbound WebSocket: node's global WebSocket ignores HTTPS_PROXY,
 * so behind a proxy this reports "could not reach the relay" regardless of the
 * solver's state.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools/pure'
import { getConversationKey, encrypt, decrypt } from 'nostr-tools/nip44'

import { RFQ_DIRECTED_KIND } from '@arkade-os/swap/nostr'

const KIND = RFQ_DIRECTED_KIND
const WAIT_MS = 20_000

const here = dirname(fileURLToPath(import.meta.url))
const card = JSON.parse(readFileSync(join(here, '../src/lib/beta-solver.card.json'), 'utf8'))
const solver = card.discovery_pubkey
const relay = process.argv[2] ?? card.transports.nostr.relays[0]

const sk = generateSecretKey()
const pk = getPublicKey(sk)
const ck = getConversationKey(sk, solver)
const rfqId = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex')

const request = {
  v: 1,
  type: 'rfq_request',
  rfq_id: rfqId,
  pair: 'arkade:BTC->lightning:BTC',
  amount_side: 'to',
  profile: { invoice: 'lnbc-probe-not-a-real-invoice', refund_address: 'ark1probe' },
}

console.log(`relay   ${relay}`)
console.log(`solver  ${solver}`)
console.log(`probing as ${pk}\n`)

const ws = new WebSocket(relay)
let accepted = false
let delivered = false
let replied = false

ws.addEventListener('open', () => {
  // Two subscriptions: one mirrors the SOLVER's own filter (does our request
  // reach a subscriber shaped like it?), one listens for the answer to us.
  ws.send(JSON.stringify(['REQ', 'reaches-solver-filter', { kinds: [KIND], '#p': [solver] }]))
  ws.send(JSON.stringify(['REQ', 'reply', { kinds: [KIND], '#p': [pk] }]))
  setTimeout(() => {
    const event = finalizeEvent(
      {
        kind: KIND,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['p', solver]],
        content: encrypt(JSON.stringify(request), ck),
      },
      sk,
    )
    ws.send(JSON.stringify(['EVENT', event]))
  }, 1500)
})

ws.addEventListener('message', (message) => {
  const msg = JSON.parse(message.data)
  if (msg[0] === 'OK') {
    accepted = msg[2]
    if (!accepted) console.log(`relay REJECTED the event: ${msg[3]}`)
  } else if (msg[0] === 'NOTICE') {
    console.log(`relay notice: ${msg[1]}`)
  } else if (msg[0] === 'EVENT' && msg[1] === 'reaches-solver-filter' && msg[2].pubkey === pk) {
    delivered = true
  } else if (msg[0] === 'EVENT' && msg[1] === 'reply') {
    replied = true
    try {
      console.log('SOLVER REPLIED:', JSON.stringify(JSON.parse(decrypt(msg[2].content, ck))))
    } catch (err) {
      // A reply we cannot open means the solver sealed it to a different key
      // than the one it addressed — worth seeing rather than swallowing.
      console.log(`reply could not be decrypted: ${err.message}`)
    }
  }
})

ws.addEventListener('error', () => console.log('websocket error'))

setTimeout(() => {
  console.log(`\nrelay accepted our request:            ${accepted ? 'yes' : 'no'}`)
  console.log(`delivered to the solver's own filter:  ${delivered ? 'yes' : 'no'}`)
  console.log(`solver answered:                       ${replied ? 'yes' : 'no'}`)
  if (replied) console.log('\n=> the send path is live end to end.')
  else if (delivered) console.log('\n=> our side is fine; the solver is not listening on this relay.')
  else if (accepted) console.log('\n=> the relay took the event but does not deliver it; check the relay.')
  else console.log('\n=> could not reach the relay at all.')
  process.exit(replied ? 0 : 1)
}, WAIT_MS)
