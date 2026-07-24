#!/usr/bin/env node

// This script fetches the solver card from the solver API and generates the discovery and registry JSON files.
// It is intended to be run in the regtest environment, where the solver API is running locally.
// The generated JSON files are used by the wallet to discover available solvers and their markets.
// Files are written to the public directory so that they can be served by the wallet's web server, no CORS issues.
// - http://localhost:3002/solver-registry/regtest.json
// - http://localhost:3002/asset-registry/regtest.json

import { writeFile } from 'node:fs/promises'

const options = {
  solverApiUrl: 'http://localhost:7091/v1/card?name=frenchman',
  filenames: {
    discovery: './public/solver-registry/regtest.json',
    registry: './public/asset-registry/regtest.json',
  },
}

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Request failed (${response.status}) for ${url}`)
  return response.json()
}

function normalizeCard(json) {
  const fixUrl = (obj) => JSON.stringify(obj).replaceAll('http://pricefeed', 'http://localhost:8088')
  const addSolverToMarkets = (obj) => {
    if (obj.markets) {
      obj.markets = obj.markets.map((market) => ({
        solver: obj.name,
        ...market,
      }))
    }
    return obj
  }
  const addAdditionalFields = (obj) => {
    return {
      ...obj,
      network: 'regtest',
      commit: 'a'.repeat(40),
      generated_at: Math.floor(Date.now() / 1000),
    }
  }
  return addAdditionalFields(addSolverToMarkets(JSON.parse(fixUrl(json))))
}

async function main() {
  const solverCard = await fetchJson(options.solverApiUrl)
  const normalized = normalizeCard(solverCard)

  const solverRegistry = JSON.stringify(normalized, null, 2)
  await writeFile(options.filenames.discovery, solverRegistry, 'utf8')

  const assetRegistry = JSON.stringify([normalized.markets[0].quote_asset.id])
  await writeFile(options.filenames.registry, assetRegistry, 'utf8')
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
