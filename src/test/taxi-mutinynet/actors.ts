import { expect, type Page } from '@playwright/test'
import {
  ArkAddress,
  InMemoryContractRepository,
  InMemoryIntentRepository,
  InMemoryVirtualTxRepository,
  InMemoryWalletRepository,
  MnemonicIdentity,
  MUTINYNET_EMULATOR_PUBKEY,
  RestArkProvider,
  RestDelegateProvider,
  RestIndexerProvider,
  SingleKey,
  Wallet,
  configureEventSource,
  toXOnlySignerHex,
} from '@arkade-os/sdk'
import { TaxiClient } from '@arkade-taxi/client'
import { base64, hex } from '@scure/base'
import { Transaction } from '@scure/btc-signer'
import { EventSource } from 'eventsource'
import { nip19 } from 'nostr-tools'
import { dismissPaymentSuccess, navigateHome, navigateToSettings } from '../e2e/utils'
import { enterReceiveAmount, holdings, openSatsSend, tr, type Actor, type TaxiStatus } from '../taxi-live/actors'
import { assertNoSecrets } from './safety'

export const ARKD = 'https://mutinynet.arkade.sh'
export const TAXI = 'https://taxi.mutinynet.arkade.sh'
export const DELEGATOR = 'https://delegator.mutinynet.arkade.sh'

export function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required for a live Taxi run`)
  return value
}

export async function publicJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!response.ok) throw new Error(`Live GET failed: HTTP ${response.status}`)
  return (await response.json()) as T
}

export async function adminGet<T>(path: 'status' | 'funding' | 'advances'): Promise<T | undefined> {
  const names = ['TAXI_ADMIN_URL', 'TAXI_ADMIN_USER', 'TAXI_ADMIN_PASS']
  if (!names.some((name) => process.env[name])) return undefined
  names.forEach(required)
  const base = new URL(required('TAXI_ADMIN_URL'))
  if (base.protocol !== 'https:' || base.username || base.password) throw new Error('Live admin requires an HTTPS URL')
  const response = await fetch(`${base.toString().replace(/\/$/, '')}/admin/api/${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${Buffer.from(`${required('TAXI_ADMIN_USER')}:${required('TAXI_ADMIN_PASS')}`).toString('base64')}`,
    },
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`Live admin GET ${path}: HTTP ${response.status}`)
  return (await response.json()) as T
}

export async function preflight() {
  required('TAXI_LIVE_FUNDER_MNEMONIC')
  const [ready, info, arkd, delegate] = await Promise.all([
    publicJson<{ status: string }>(`${TAXI}/ready`),
    new TaxiClient({ baseUrl: TAXI }).info(),
    new RestArkProvider(ARKD).getInfo(),
    new RestDelegateProvider(DELEGATOR).getDelegateInfo(),
  ])
  expect(ready.status, 'Taxi must be ready before moving funds').toBe('ok')
  expect(info.paused, 'Taxi must be unpaused').toBe(false)
  expect(arkd.network).toBe('mutinynet')
  expect(info.operatorKey).toBe(required('TAXI_LIVE_OPERATOR_KEY').toLowerCase())
  const server = toXOnlySignerHex(required('TAXI_LIVE_SERVER_KEY'))
  expect(toXOnlySignerHex(arkd.signerPubkey)).toBe(server)
  expect(info.serverKey).toBe(server)
  expect(info.emulatorKey).toBe(toXOnlySignerHex(MUTINYNET_EMULATOR_PUBKEY))
  expect(arkd.dust).toBe(330n)
  expect(arkd.vtxoMinAmount).toBe(1n)
  expect(info.dust).toBe('330')
  expect(info.vtxoMinAmount).toBe('1')
  expect(BigInt(info.maxPerPaymentTopupSats)).toBeGreaterThanOrEqual(330n)
  for (const id of [null, '*']) {
    const rule = info.assetRules.find((item) => item.assetId === id)
    expect(rule).toMatchObject({ enabled: true, claim: 'recycle' })
    expect(
      rule?.fares.some(
        (fare) => fare.currency === 'sats' && fare.pricing.kind === 'flat' && fare.pricing.units === '0',
      ),
    ).toBe(true)
    expect(BigInt(rule?.maxTopupSats ?? info.maxPerPaymentTopupSats)).toBeGreaterThanOrEqual(330n)
  }
  await adminGet('status')
  await adminGet('funding')
  return { info, arkd, delegate }
}

export const funderWallet = (delegate: Awaited<ReturnType<typeof preflight>>['delegate']) =>
  signingWallet(required('TAXI_LIVE_FUNDER_MNEMONIC'), delegate)

export async function signingWallet(
  secret: string,
  delegate: Awaited<ReturnType<typeof preflight>>['delegate'],
): Promise<Wallet> {
  configureEventSource((url) => new EventSource(url))
  try {
    const decoded = secret.startsWith('nsec1') ? nip19.decode(secret) : undefined
    const identity =
      decoded?.type === 'nsec'
        ? SingleKey.fromPrivateKey(decoded.data)
        : MnemonicIdentity.fromMnemonic(secret, { isMainnet: false })
    return await Wallet.create({
      identity,
      walletMode: 'static',
      arkServerUrl: ARKD,
      esploraUrl: 'https://mutinynet.com/api',
      minCheckpointExitDelaySeconds: 4096n,
      settlementConfig: false,
      delegateProvider: {
        getDelegateInfo: async () => delegate,
        delegate: async () => {
          throw new Error('Live Node wallets never delegate existing funds')
        },
      },
      storage: {
        walletRepository: new InMemoryWalletRepository(),
        contractRepository: new InMemoryContractRepository(),
        intentRepository: new InMemoryIntentRepository(),
        virtualTxRepository: new InMemoryVirtualTxRepository(),
      },
    })
  } catch {
    throw new Error('Live signing wallet initialization failed; check recovery derivation privately')
  }
}

export async function recoverySecret(actor: Actor): Promise<string> {
  try {
    try {
      await navigateToSettings(actor.page)
      await actor.page.getByText(tr.settings.backup, { exact: true }).click()
      await actor.page
        .getByText(tr.backup.viewRecoveryPhrase)
        .or(actor.page.getByText(tr.backup.viewPrivateKey))
        .click()
      await actor.page.getByText(tr.common.confirm, { exact: true }).click()
      const secret = (await actor.page.getByTestId('private-key').innerText()).trim()
      if (!secret || secret === '*******') throw new Error('Missing recovery identity')
      return secret
    } finally {
      await actor.page.goto('/')
      await expect(actor.page.getByTestId('home-action-receive')).toBeVisible()
    }
  } catch {
    throw new Error('Could not capture the fresh actor recovery identity before funding')
  }
}

export async function ownedAssets(address: string): Promise<Record<string, string>> {
  const { vtxos } = await new RestIndexerProvider(ARKD).getVtxos({
    scripts: [hex.encode(ArkAddress.decode(address).pkScript)],
    spendableOnly: true,
  })
  const amounts: Record<string, bigint> = {}
  for (const asset of vtxos.flatMap((coin) => coin.assets ?? []))
    amounts[asset.assetId] = (amounts[asset.assetId] ?? 0n) + asset.amount
  return Object.fromEntries(Object.entries(amounts).map(([id, amount]) => [id, String(amount)]))
}

export function runMintId(before: Record<string, string>, after: Record<string, string>): string | undefined {
  const entries = Object.entries(after)
  if (Object.keys(before).length || entries.length > 1 || (entries.length === 1 && entries[0][1] !== '20'))
    throw new Error('Unexpected holdings for the live run mint')
  return entries[0]?.[0]
}

export async function resolveRunMint(actor: Actor, before: Record<string, string>): Promise<string> {
  await expect.poll(() => ownedAssets(actor.address), { timeout: 15_000, intervals: [250, 500, 1_000] }).not.toEqual({})
  const id = runMintId(before, await ownedAssets(actor.address))
  if (!id) throw new Error('Live run mint was not found in the indexer')
  return id
}

export async function sweepSdk(actor: Actor, wallet: Wallet, funder: string, assetId: string): Promise<void> {
  expect(await wallet.getAddress()).toBe(actor.address)
  const remaining = await holdings(actor.address, assetId, ARKD)
  if (BigInt(remaining.sats) === 0n) return
  await wallet.send({
    address: funder,
    amount: Number(remaining.sats),
    ...(assetId && BigInt(remaining.units) > 0n ? { assets: [{ assetId, amount: BigInt(remaining.units) }] } : {}),
  })
  await expect.poll(() => holdings(actor.address, assetId, ARKD)).toEqual({ sats: '0', units: '0' })
}

export const status = (id: string) => publicJson<TaxiStatus>(`${TAXI}/v1/transfers/${id}`)

export async function coinSpent(transfer: TaxiStatus): Promise<void> {
  expect(transfer.outpoint).toBeDefined()
  expect(transfer.spentTxid).toBeDefined()
  const indexer = new RestIndexerProvider(ARKD)
  await expect(async () => {
    const { vtxos } = await indexer.getVtxos({ outpoints: [transfer.outpoint!] })
    expect(vtxos).toHaveLength(1)
    expect(vtxos[0].isSpent).toBe(true)
    const raw = await indexer.getVirtualTxs([transfer.spentTxid!])
    expect(raw.txs).toHaveLength(1)
    const claim = Transaction.fromPSBT(base64.decode(raw.txs[0]))
    expect(claim.id).toBe(transfer.spentTxid)
    const checkpoints = await indexer.getVirtualTxs([hex.encode(claim.getInput(0).txid!)])
    expect(checkpoints.txs).toHaveLength(1)
    const checkpoint = Transaction.fromPSBT(base64.decode(checkpoints.txs[0]))
    expect(hex.encode(checkpoint.getInput(0).txid!)).toBe(transfer.outpoint!.txid)
    expect(checkpoint.getInput(0).index).toBe(transfer.outpoint!.vout)
  }).toPass({ timeout: 60_000 })
}

export async function satsRequest(bob: Actor, sats: number, fare: string): Promise<string> {
  await navigateHome(bob.page)
  await bob.page.getByText(tr.wallet.receive, { exact: true }).click()
  await enterReceiveAmount(bob.page, String(sats))
  await bob.page.getByRole('button', { name: 'Taxi: off', exact: true }).click()
  await bob.page.getByRole('option', { name: `${fare} · 0 sats`, exact: true }).click()
  const request = (await bob.page.getByTestId('bip21').textContent())!
  expect(request).toContain(`taxi=${encodeURIComponent(TAXI)}`)
  await navigateHome(bob.page)
  return request
}

export async function sweep(actor: Actor, funder: string, assetId: string): Promise<void> {
  const indexer = new RestIndexerProvider(ARKD)
  const coins = async () =>
    (await indexer.getVtxos({ scripts: [hex.encode(ArkAddress.decode(actor.address).pkScript)], spendableOnly: true }))
      .vtxos
  const units = (await coins())
    .flatMap((coin) => coin.assets ?? [])
    .filter((asset) => asset.assetId === assetId)
    .reduce((sum, asset) => sum + asset.amount, 0n)
  if (assetId && units > 0n) {
    await navigateHome(actor.page)
    await actor.page.getByText(tr.wallet.send, { exact: true }).click()
    await actor.page
      .locator('input[name="send-address"]')
      .fill(`bitcoin:?ark=${funder}&assetid=${assetId}&amount=${units}`)
    await actor.page.getByRole('button', { name: tr.common.continue, exact: true }).click()
    await actor.page.getByRole('button', { name: tr.send.tapToSign, exact: true }).click()
    await dismissPaymentSuccess(actor.page)
  }
  const remaining = (await coins()).reduce((sum, coin) => sum + BigInt(coin.value), 0n)
  if (!remaining) return
  await openSatsSend(actor, funder, Number(remaining))
  await actor.page.getByText(/sats available$/).click()
  const sendMax = actor.page.getByRole('button', { name: tr.send.sendMax, exact: true })
  if (await sendMax.isVisible()) await sendMax.click()
  await expect(actor.page.locator('input[name="send-amount"]')).toHaveValue(String(remaining))
  await actor.page.getByRole('button', { name: tr.common.continue, exact: true }).click()
  await actor.page.getByRole('button', { name: tr.send.tapToSign, exact: true }).click()
  await dismissPaymentSuccess(actor.page)
  await expect.poll(async () => (await coins()).length).toBe(0)
}

export function safeMessage(error: unknown, secrets?: string[]): string {
  const message = error instanceof Error ? error.message : 'Live step failed'
  try {
    assertNoSecrets({ message }, secrets)
    return message
  } catch {
    return 'Live step failed; sensitive error withheld'
  }
}

export async function ownTransfer(page: Page, pay: () => Promise<void>) {
  const response = page.waitForResponse(
    (response) => response.url() === `${TAXI}/v1/transfers` && response.request().method() === 'POST',
  )
  await pay()
  const quote = (await (await response).json()) as { transferId: string; params: { dust: string; topup: string } }
  expect(quote.transferId).toMatch(/^[0-9a-f-]{36}$/)
  return { id: quote.transferId, dust: quote.params.dust, topup: quote.params.topup }
}
