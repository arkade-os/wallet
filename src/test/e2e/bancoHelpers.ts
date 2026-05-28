/**
 * Banco e2e test helpers.
 *
 * Provides functions to configure the solver bot, issue assets,
 * and fund the solver with assets — all from the Node.js test process.
 */
import {
  ArkNote,
  ArkAddress,
  InMemoryContractRepository,
  InMemoryWalletRepository,
  SingleKey,
  Wallet,
} from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { exec } from 'child_process'
import { EventSource } from 'eventsource'
import { promisify } from 'util'

const execAsync = promisify(exec)

const ARK_URL = 'http://localhost:7070'
const SOLVER_URL = 'http://localhost:7091'

// ── SDK wallet helpers ──

async function createNote(amount: number): Promise<string> {
  const { stdout } = await execAsync(`docker exec -t arkd arkd note --amount ${amount}`)
  return stdout.trim()
}

async function waitForSettledBalance(
  getBalance: () => Promise<{ settled: number; available: number }>,
  minAmount = 100,
  timeout = 30_000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId)
      reject(new Error('Timed out waiting for settled balance'))
    }, timeout)
    const intervalId = setInterval(async () => {
      try {
        const balance = await getBalance()
        if (balance.settled >= minAmount) {
          clearTimeout(timeoutId)
          clearInterval(intervalId)
          resolve()
        }
      } catch {
        // keep waiting
      }
    }, 500)
  })
}

/** Create a funded SDK wallet with the given amount of sats. */
export async function createFundedWallet(amount = 100_000): Promise<Wallet> {
  globalThis.EventSource ??= EventSource as typeof globalThis.EventSource

  const wallet = await Wallet.create({
    identity: SingleKey.fromRandomBytes(),
    arkServerUrl: ARK_URL,
    storage: {
      walletRepository: new InMemoryWalletRepository(),
      contractRepository: new InMemoryContractRepository(),
    },
    settlementConfig: false,
  })

  await wallet.settle({
    inputs: [ArkNote.fromString(await createNote(amount))],
    outputs: [{ address: await wallet.getAddress(), amount: BigInt(amount) }],
  })

  await waitForSettledBalance(() => wallet.getBalance())
  return wallet
}

/**
 * Issue an asset from a funded wallet. Returns the asset ID string.
 *
 * Sets `decimals: 0` metadata — the solver's pair validation requires the asset
 * to publish a `decimals` value via the indexer.
 */
export async function issueAsset(wallet: Wallet, supply: number): Promise<string> {
  const result = await wallet.assetManager.issue({
    amount: supply,
    metadata: { decimals: 0 },
  })
  return result.assetId
}

/** Send an asset from one wallet to an ark address. */
export async function sendAsset(
  wallet: Wallet,
  toAddress: string,
  assetId: string,
  assetAmount: number,
  btcAmount = 1000,
): Promise<string> {
  return wallet.send({
    address: toAddress,
    amount: btcAmount,
    assets: [{ assetId, amount: assetAmount }],
  })
}

// ── solver bot helpers ──

/** Get the solver's offchain ark address. */
export async function getSolverAddress(): Promise<string> {
  const resp = await fetch(`${SOLVER_URL}/v1/address`)
  if (!resp.ok) {
    throw new Error(`Failed to get solver address: ${resp.status} ${await resp.text()}`)
  }
  const data = (await resp.json()) as { offchain_address?: string; offchainAddress?: string }
  const addr = data.offchain_address ?? data.offchainAddress
  if (!addr) throw new Error(`Unexpected solver address response: ${JSON.stringify(data)}`)
  return addr
}

/**
 * Add a trading pair on the solver.
 *
 * The pair name encodes both sides of the swap: each side is either `BTC` for
 * native bitcoin or the hex asset id. To want BTC, leave the quote side empty
 * (e.g. `<asset_id>/`).
 */
export async function addBancoPair(pair: string, priceFeed: string): Promise<void> {
  const resp = await fetch(`${SOLVER_URL}/v1/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pair: {
        pair,
        min_amount: 1,
        max_amount: 100_000_000,
        price_feed: priceFeed,
      },
    }),
  })
  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`Failed to add banco pair: ${resp.status} ${body}`)
  }
}

/** Remove a trading pair from the solver. */
export async function removeBancoPair(pair: string): Promise<void> {
  await fetch(`${SOLVER_URL}/v1/pair/${encodeURIComponent(pair)}`, {
    method: 'DELETE',
  })
}

/** Fund the solver's wallet with an asset by sending from a helper wallet. */
export async function fundSolverWithAsset(supply: number): Promise<string> {
  const helperWallet = await createFundedWallet(100_000)
  const assetId = await issueAsset(helperWallet, supply)
  // The wallet's coin view lags issuance by an arkd round; wait for the asset
  // VTXO to materialize before trying to send it.
  await waitForAssetVtxo(helperWallet, assetId)
  const solverAddr = await getSolverAddress()
  await sendAsset(helperWallet, solverAddr, assetId, supply)
  // Give the solver time to see the incoming VTXO
  await new Promise((r) => setTimeout(r, 3000))
  return assetId
}

/** Fund the solver with BTC by sending offchain from a helper wallet. */
export async function fundSolverWithBtc(amount = 50_000): Promise<void> {
  const helperWallet = await createFundedWallet(200_000)
  const solverAddr = await getSolverAddress()
  await helperWallet.send({ address: solverAddr, amount })
  await new Promise((r) => setTimeout(r, 3000))
}

/** Convert a swap pkScript to an ark address using the server's public key. */
export async function swapPkScriptToAddress(swapPkScript: Uint8Array): Promise<string> {
  const info = await fetch(`${ARK_URL}/v1/info`).then((r) => r.json())
  const rawPubkey = hex.decode(info.signerPubkey || info.signer_pubkey)
  const serverPubKey = rawPubkey.length === 33 ? rawPubkey.slice(1) : rawPubkey
  const addrPrefix = info.addrPrefix || info.addr_prefix || 'tark'
  const vtxoKey = swapPkScript.slice(2)
  return new ArkAddress(serverPubKey, vtxoKey, addrPrefix).encode()
}

/** Wait until the wallet has at least one VTXO with the given asset ID. */
export async function waitForAssetVtxo(wallet: Wallet, assetId: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const vtxos = await wallet.getVtxos()
    const found = vtxos.some((v) => v.assets && v.assets.some((a) => a.assetId === assetId))
    if (found) return
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error(`Timed out waiting for asset ${assetId} VTXO`)
}
