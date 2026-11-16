import assert from 'node:assert/strict'
import { it as test } from 'vitest'
import { stableStringify, validateCard } from '@arkade-os/solver-discovery'
import { schnorr } from '@noble/curves/secp256k1.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { hex } from '@scure/base'
import { nativeRegistry } from './taxi-native-registry.mjs'
import { endpoint, sanitizedError } from './taxi-native-env.mjs'

const key = new Uint8Array(32).fill(3)
const assetId = 'ab'.repeat(34)
const options = {
  assetId,
  discoveryPubkey: hex.encode(schnorr.getPublicKey(key)),
  feedUrl: 'http://127.0.0.1:17091/price',
  relayUrl: 'wss://localhost:17443',
  commit: 'ab'.repeat(20),
}

function signedCard(update = {}) {
  const unsigned = {
    version: 0,
    name: 'wallet-native',
    discovery_pubkey: options.discoveryPubkey,
    transports: { nostr: { relays: [options.relayUrl] } },
    markets: [
      {
        base_asset: { id: 'arkade:regtest/slip44:1', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
        quote_asset: { id: `arkade:regtest/asset:${assetId}`, name: 'ARFQ', ticker: 'ARFQ', decimals: 0 },
        price_feed: options.feedUrl,
        price_feed_schema: { type: 'json', price_path: '/price' },
        price_decimals: 0,
        fee_bps: 0,
        min_base_amount: '1',
        max_base_amount: '1000000000',
        min_quote_amount: '1',
        max_quote_amount: '1000000000',
      },
    ],
    ...update,
  }
  return (
    JSON.stringify(
      { ...unsigned, sig: hex.encode(schnorr.sign(sha256(new TextEncoder().encode(stableStringify(unsigned))), key)) },
      null,
      2,
    ) + '\n'
  )
}

test('preserves the original signed card and enriches every flat market with authentic rendezvous', () => {
  const raw = signedCard()
  const before = raw
  const card = validateCard(JSON.parse(raw)).value
  assert.ok(card)
  const index = nativeRegistry(raw, options)
  assert.equal(raw, before)
  assert.equal(index.version, 0)
  assert.equal(index.network, 'regtest')
  assert.equal(index.commit, options.commit)
  assert.deepEqual(
    index.markets,
    card.markets.map((market) => ({
      ...market,
      solver: card.name,
      discovery_pubkey: card.discovery_pubkey,
      transports: card.transports,
    })),
  )
  assert.equal(JSON.parse(raw).sig, card.sig)
})

test('accepts actual format1 cards while keeping the index at format0', () => {
  assert.equal(nativeRegistry(signedCard({ version: 1 }), options).version, 0)
})

test('refuses a post-sign feed rewrite', () => {
  const changed = JSON.parse(signedCard())
  changed.markets[0].price_feed = 'http://127.0.0.1:19999/price'
  assert.throws(() => nativeRegistry(JSON.stringify(changed), options), /signature is invalid/)
})

test('refuses a different signer identity', () => {
  assert.throws(() => nativeRegistry(signedCard(), { ...options, discoveryPubkey: 'ff'.repeat(32) }), /identity/)
})

test('refuses a correctly signed card advertising internal ws instead of browser wss', () => {
  assert.throws(
    () =>
      nativeRegistry(signedCard({ transports: { nostr: { relays: ['ws://relay:7777', options.relayUrl] } } }), options),
    /wss relay/,
  )
})

test('refuses the wrong minted asset, feed, network and future card format', () => {
  assert.throws(() => nativeRegistry(signedCard(), { ...options, assetId: 'cd'.repeat(34) }), /BTC-to-ARFQ/)
  assert.throws(
    () => nativeRegistry(signedCard(), { ...options, feedUrl: 'http://127.0.0.1:19999/price' }),
    /exact feed/,
  )
  const card = JSON.parse(signedCard())
  card.markets[0].quote_asset.id = `arkade:signet/asset:${assetId}`
  const { sig, ...unsigned } = card
  assert.throws(() => nativeRegistry(signedCard(unsigned), options), /BTC-to-ARFQ|another network/)
  assert.throws(() => nativeRegistry(signedCard({ version: 2 }), options), /Invalid signed solver card/)
})

test('requires credential-free advertised wss endpoints and redacts private failure values', () => {
  assert.equal(endpoint({ RELAY: options.relayUrl }, 'RELAY', ['wss:']), options.relayUrl)
  assert.throws(() => endpoint({ RELAY: 'ws://localhost:7777' }, 'RELAY', ['wss:']), /credential-free/)
  assert.throws(() => endpoint({ RELAY: 'wss://user:pass@localhost' }, 'RELAY', ['wss:']), /credential-free/)
  assert.equal(
    sanitizedError(new Error('bad phrase and secret'), { ARK_MNEMONIC: 'phrase', ARKD_PASSWORD: 'secret' }),
    'bad [redacted] and [redacted]',
  )
})
