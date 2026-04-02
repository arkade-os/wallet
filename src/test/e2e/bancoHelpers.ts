/**
 * Banco e2e test helpers.
 *
 * Provides functions to configure fulmine's taker bot, issue assets,
 * and fund fulmine with assets — all from the Node.js test process.
 */
import {
  ArkNote,
  InMemoryContractRepository,
  InMemoryWalletRepository,
  SingleKey,
  Wallet,
  AssetManager,
} from '@arkade-os/sdk'
import { exec } from 'child_process'
import { EventSource } from 'eventsource'
import { promisify } from 'util'

const execAsync = promisify(exec)

const ARK_URL = 'http://localhost:7070'
const FULMINE_URL = 'http://localhost:7001'

// ── SDK wallet helpers ──

async function createNote(amount: number): Promise<string> {
  const { stdout } = await execAsync(`docker exec -t arkd arkd note --amount ${amount}`)
  return stdout.trim()
}

async function waitForBalance(
  getBalance: () => Promise<{ available: number }>,
  minAmount = 100,
  timeout = 10_000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId)
      reject(new Error('Timed out waiting for balance'))
    }, timeout)
    const intervalId = setInterval(async () => {
      try {
        const balance = await getBalance()
        if (balance.available >= minAmount) {
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
  })

  await wallet.settle({
    inputs: [ArkNote.fromString(await createNote(amount))],
    outputs: [{ address: await wallet.getAddress(), amount: BigInt(amount) }],
  })

  await waitForBalance(() => wallet.getBalance())
  return wallet
}

/** Issue an asset from a funded wallet. Returns the asset ID string. */
export async function issueAsset(wallet: Wallet, supply: number): Promise<string> {
  const am = new AssetManager(wallet)
  const result = await am.issue({ amount: supply })
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

// ── Fulmine taker bot helpers ──

/** Get fulmine's offchain ark address. */
export async function getFulmineAddress(): Promise<string> {
  const resp = await fetch(`${FULMINE_URL}/api/v1/address`)
  const data = await resp.json()
  // BIP21 format: bitcoin:<onchain>?ark=<offchain>
  const bip21: string = data.address
  const parts = bip21.split('?ark=')
  if (parts.length !== 2) throw new Error('Unexpected fulmine address format: ' + bip21)
  return parts[1]
}

/** Add a banco pair on fulmine's taker bot. */
export async function addBancoPair(pair: string, quoteAssetId: string, priceFeed: string): Promise<void> {
  const resp = await fetch(`${FULMINE_URL}/api/v1/banco/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pair,
      quote_asset_id: quoteAssetId,
      min_amount: '1',
      max_amount: '100000000',
      price_feed: priceFeed,
    }),
  })
  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`Failed to add banco pair: ${resp.status} ${body}`)
  }
}

/** Remove a banco pair from fulmine's taker bot. */
export async function removeBancoPair(pair: string): Promise<void> {
  await fetch(`${FULMINE_URL}/api/v1/banco/pair/${encodeURIComponent(pair)}`, {
    method: 'DELETE',
  })
}

/** Fund fulmine's taker wallet with an asset by sending from a helper wallet. */
export async function fundFulmineWithAsset(supply: number): Promise<string> {
  const helperWallet = await createFundedWallet(100_000)
  const assetId = await issueAsset(helperWallet, supply)
  const fulmineAddr = await getFulmineAddress()
  await sendAsset(helperWallet, fulmineAddr, assetId, supply)
  // Give fulmine time to see the incoming VTXO
  await new Promise((r) => setTimeout(r, 3000))
  return assetId
}

/** Fund fulmine with BTC by sending offchain from a helper wallet. */
export async function fundFulmineWithBtc(amount = 50_000): Promise<void> {
  const helperWallet = await createFundedWallet(200_000)
  const fulmineAddr = await getFulmineAddress()
  await helperWallet.send({ address: fulmineAddr, amount })
  await new Promise((r) => setTimeout(r, 3000))
}
