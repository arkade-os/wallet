#!/usr/bin/env node

import { execSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { asset } from '@arkade-os/sdk'

const DEFAULTS = {
  version: 0,
  feeBps: 110,
  priceDecimals: 0,
  network: 'regtest',
  solver: 'jpmorgan',
  pricePath: '/bitcoin/asset',
  pairsUrl: 'http://localhost:7091/v1/pairs',
  assetUrlBase: 'http://localhost:7070/v1/indexer/asset',
  filenames: {
    discovery: './public/solver-registry/regtest.json',
    registry: './public/asset-registry/regtest.json',
  },
}

const BTC_ASSET = {
  id: 'btc',
  name: 'Bitcoin',
  ticker: 'BTC',
  decimals: 8,
}

const textDecoder = new TextDecoder()

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`)
  }

  return response.json()
}

function parsePair(pair) {
  const [base, quote] = pair.split('/')
  if (!base || !quote) {
    throw new Error(`Invalid pair format: ${pair}`)
  }

  return { base, quote }
}

function isBtc(symbol) {
  return symbol.toUpperCase() === 'BTC'
}

function extractAssetIds(pairs) {
  const ids = new Set()

  for (const entry of pairs) {
    if (!entry?.pair) continue
    const { base, quote } = parsePair(entry.pair)

    if (isBtc(base) && !isBtc(quote)) ids.add(quote)
    if (!isBtc(base) && isBtc(quote)) ids.add(base)
  }

  return [...ids]
}

function decodeMetadataHex(metadataHex) {
  if (!metadataHex) return {}

  const bytes = Uint8Array.from(Buffer.from(metadataHex, 'hex'))
  const list = asset.MetadataList.fromBytes(bytes)
  const metadata = {}

  for (const item of list.items || []) {
    const key = textDecoder.decode(item.key)
    const value = textDecoder.decode(item.value)
    metadata[key] = value
  }

  return metadata
}

function resolveCommit() {
  if (process.env.COMMIT) return process.env.COMMIT

  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

async function buildConfig(options) {
  const pairsData = await fetchJson(options.pairsUrl)
  const pairs = pairsData?.pairs || []
  const assetIds = extractAssetIds(pairs)

  const markets = []

  for (const assetId of assetIds) {
    const btcToAsset = pairs.find((p) => p?.pair === `BTC/${assetId}`)
    const assetToBtc = pairs.find((p) => p?.pair === `${assetId}/BTC`)

    if (!btcToAsset || !assetToBtc) {
      continue
    }

    const details = await fetchJson(`${options.assetUrlBase}/${assetId}`)
    const metadata = decodeMetadataHex(details?.metadata)
    const quoteDecimals = Number(metadata.decimals ?? 0)

    markets.push({
      pair: 'BTC/RGT',
      base_asset: BTC_ASSET,
      quote_asset: {
        id: assetId,
        name: metadata.name || 'Unknown Asset',
        ticker: metadata.ticker || 'ASSET',
        decimals: Number.isNaN(quoteDecimals) ? 0 : quoteDecimals,
      },
      price_feed: btcToAsset.price_feed,
      price_feed_schema: {
        type: 'json',
        price_path: options.pricePath,
      },
      price_decimals: DEFAULTS.priceDecimals,
      fee_bps: options.feeBps,
      min_base_amount: String(btcToAsset.min_amount),
      max_base_amount: String(btcToAsset.max_amount),
      min_quote_amount: String(assetToBtc.min_amount),
      max_quote_amount: String(assetToBtc.max_amount),
      solver: options.solver,
    })
  }

  return {
    version: DEFAULTS.version,
    network: options.network,
    generated_at: Math.floor(Date.now() / 1000),
    commit: resolveCommit(),
    markets,
  }
}

async function main() {
  const options = DEFAULTS
  const config = await buildConfig(options)

  const market = `${JSON.stringify(config, null, 2)}\n`
  await writeFile(options.filenames.discovery, market, 'utf8')

  const registry = JSON.stringify([config.markets[0].quote_asset.id])
  await writeFile(options.filenames.registry, registry, 'utf8')
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
