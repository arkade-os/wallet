import { createServer } from 'node:http'
import type { FullConfig } from '@playwright/test'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { ArkAddress, RestArkProvider, getNetwork, toXOnlySignerHex, type NetworkName } from '@arkade-os/sdk'
import { hex } from '@scure/base'

// A delegator that only says who it is, so an actor can opt into 3-leaf coins. It refuses every delegation:
// the SDK signs that request locally and only logs the refusal, so no coin is touched at arkd.
export default async function globalSetup(config: FullConfig) {
  const url = new URL(config.webServer!.env!.VITE_DELEGATOR_URL)
  const info = await new RestArkProvider(process.env.TAXI_E2E_ARKD_URL!).getInfo()
  const pubkey = secp256k1.getPublicKey(secp256k1.utils.randomSecretKey())
  const serverKey = hex.decode(toXOnlySignerHex(info.signerPubkey))
  const address = new ArkAddress(serverKey, pubkey.slice(1), getNetwork(info.network as NetworkName).hrp).encode()
  const json = { 'content-type': 'application/json' }
  const delegatorInfo = JSON.stringify({
    pubkey: hex.encode(pubkey),
    fee: '0',
    delegatorAddress: address,
    delegateAddress: address,
  })
  const hits: Record<string, number> = {}
  const server = createServer((request, response) => {
    const route = `${request.method} ${request.url}`
    hits[route] = (hits[route] ?? 0) + 1
    response.setHeader('access-control-allow-origin', '*')
    response.setHeader('access-control-allow-headers', '*')
    if (request.method === 'OPTIONS') return response.writeHead(204).end()
    if (route === 'GET /v1/delegator/info') return response.writeHead(200, json).end(delegatorInfo)
    if (route === 'GET /__hits') return response.writeHead(200, json).end(JSON.stringify(hits))
    response.writeHead(503, json).end(JSON.stringify({ error: 'the e2e stub delegator never delegates' }))
  })
  await new Promise<void>((listening, failed) => {
    server.once('error', failed)
    server.listen(Number(url.port), url.hostname, listening)
  })
  process.env.TAXI_E2E_DELEGATOR_URL = url.origin
  process.env.TAXI_E2E_DELEGATE_PUBKEY = hex.encode(pubkey)
  return () => new Promise<void>((closed) => server.close(() => closed()))
}
