import { stableStringify, validateCard, validateIndex, marketNetworkErrors } from '@arkade-os/solver-discovery'
import { schnorr } from '@noble/curves/secp256k1.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { hex } from '@scure/base'

/** @param {string} rawCard @param {{assetId: string, discoveryPubkey: string, feedUrl: string, relayUrl: string, commit: string}} options */
export function nativeRegistry(rawCard, { assetId, discoveryPubkey, feedUrl, relayUrl, commit }) {
  const checked = validateCard(JSON.parse(rawCard))
  if (!checked.ok || !checked.value) throw new Error(`Invalid signed solver card: ${checked.errors.join('; ')}`)
  const card = checked.value
  if (card.name !== 'wallet-native' || card.discovery_pubkey !== discoveryPubkey || typeof card.sig !== 'string')
    throw new Error('Solver card does not match the configured wallet-native identity')
  const { sig, ...unsigned } = card
  if (
    !schnorr.verify(
      hex.decode(sig),
      sha256(new TextEncoder().encode(stableStringify(unsigned))),
      hex.decode(discoveryPubkey),
    )
  )
    throw new Error('Solver card signature is invalid')
  if (
    !card.transports?.nostr?.relays?.includes(relayUrl) ||
    card.transports.nostr.relays.some((url) => !url.startsWith('wss://'))
  )
    throw new Error('Signed solver card must advertise the supplied wss relay')
  const assetMarket = card.markets.find(
    (market) =>
      market.base_asset.id === 'arkade:regtest/slip44:1' && market.quote_asset.id === `arkade:regtest/asset:${assetId}`,
  )
  if (!assetMarket || assetMarket.price_feed !== feedUrl || BigInt(assetMarket.max_quote_amount) <= 0n)
    throw new Error('Signed card does not serve the funded BTC-to-ARFQ market and exact feed')
  if (card.markets.some((market) => marketNetworkErrors(market, 'regtest').length))
    throw new Error('Signed card contains a market from another network')
  const index = {
    version: 0,
    network: 'regtest',
    generated_at: Math.floor(Date.now() / 1000),
    commit,
    markets: card.markets.map((market) => ({
      ...market,
      solver: card.name,
      discovery_pubkey: card.discovery_pubkey,
      transports: card.transports,
    })),
  }
  const valid = validateIndex(index, 'regtest')
  if (!valid.ok) throw new Error(`Invalid native registry index: ${valid.errors.join('; ')}`)
  return index
}
