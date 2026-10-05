import { expect, type Page } from '@playwright/test'
import { ArkAddress, RestIndexerProvider, asset } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import type { TaxiClient } from '@arkade-taxi/client'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { resolve } from 'node:path'
import { translations } from '../../../lib/i18n'
import {
  createWallet,
  receiveOffchain,
  waitForPaymentReceived,
  navigateHome,
  handleKeyboardInput,
  navigateToAssets,
  dismissPaymentSuccess,
} from '../utils'

export const tr = translations.en
export const taxiUrl = process.env.TAXI_REGTEST_URL ?? 'http://localhost:7400'
const adminUrl = process.env.TAXI_REGTEST_ADMIN_URL ?? 'http://localhost:7401'
export type Actor = { page: Page; address: string }
export type Balance = { sats: string; units: string }
export type Advance = { id: string; state: string; kind: string; topup: string; spentTxid?: string }
const run = promisify(execFile)

export async function admin<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${adminUrl}/admin/api/${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-taxi-operator': 'wallet-regtest' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(`Taxi ${path}: HTTP ${response.status}: ${JSON.stringify(payload)}`)
  return payload as T
}

export async function actor(page: Page, sats: number, autoClaimFreeTaxi = false): Promise<Actor> {
  await page.addInitScript((auto) => {
    localStorage.setItem(
      'config',
      JSON.stringify({
        ...JSON.parse(localStorage.getItem('config') ?? '{}'),
        currency: 'BTC',
        unit: 'sats',
        delegate: false,
        autoClaimFreeTaxi: auto,
      }),
    )
  }, autoClaimFreeTaxi)
  await createWallet(page)
  const address = await receiveOffchain(page)
  if (sats) {
    await run(
      process.execPath,
      [
        resolve('regtest/regtest.mjs'),
        'ark',
        '--env',
        resolve(process.env.TAXI_REGTEST_ENV_FILE ?? '.env.taxi-regtest'),
        'send',
        '--to',
        address,
        '--amount',
        String(sats),
        '--password',
        process.env.ARKD_PASSWORD ?? 'secret',
      ],
      { timeout: 90_000 },
    )
    await waitForPaymentReceived(page)
  }
  await navigateHome(page)
  return { page, address }
}

export async function balance(address: string, assetId = ''): Promise<Balance> {
  const { vtxos } = await new RestIndexerProvider(
    process.env.TAXI_REGTEST_ARKD_URL ?? 'http://localhost:7070',
  ).getVtxos({
    scripts: [hex.encode(ArkAddress.decode(address).pkScript)],
    spendableOnly: true,
  })
  return {
    sats: vtxos.reduce((sum, coin) => sum + BigInt(coin.value), 0n).toString(),
    units: vtxos
      .flatMap((coin) => coin.assets ?? [])
      .filter((holding) => holding.assetId === assetId)
      .reduce((sum, holding) => sum + holding.amount, 0n)
      .toString(),
  }
}

export async function ledger(parties: Record<string, string>, assetId = '') {
  return Object.fromEntries(
    await Promise.all(Object.entries(parties).map(async ([name, address]) => [name, await balance(address, assetId)])),
  )
}

export const shift = (before: Balance, sats: bigint, units = 0n): Balance => ({
  sats: String(BigInt(before.sats) + sats),
  units: String(BigInt(before.units) + units),
})
export const advances = async () => (await admin<{ advances: Advance[] }>('advances')).advances
export async function fresh(before: Advance[]) {
  return (await advances()).filter(({ id }) => !before.some((previous) => previous.id === id))
}
export async function status(id: string) {
  const response = await fetch(`${taxiUrl}/v1/transfers/${id}`)
  if (!response.ok) throw new Error(`Taxi transfer: ${response.status}`)
  return (await response.json()) as Advance
}

export async function send(alice: Actor, request: string, amount: string, mode: string) {
  const page = alice.page
  await navigateHome(page)
  await page.getByText(tr.wallet.send, { exact: true }).click()
  await page.locator('input[name="send-address"]').fill(request)
  const input = page.locator('input[name="send-amount"]')
  if ((await input.inputValue()) !== amount) {
    if (await page.evaluate(() => 'ontouchstart' in window || navigator.maxTouchPoints > 0)) {
      await input.click()
      await handleKeyboardInput(page, Number(amount))
    } else await input.fill(amount)
  }
  await page.getByTestId('taxi-send-mode').click()
  await page.getByRole('radio', { name: mode, exact: true }).click()
  await page.getByRole('button', { name: tr.common.continue, exact: true }).click()
}

export async function pay(alice: Actor) {
  const costs = alice.page.getByTestId('taxi-confirm-costs')
  const error = alice.page.getByTestId('error-message')
  await costs.or(error).first().waitFor({ state: 'visible' })
  if (await error.isVisible()) throw new Error(await error.innerText())
  await alice.page.getByRole('button', { name: 'Pay', exact: true }).click()
  const deadline = Date.now() + 60000
  const success = alice.page.getByRole('button', { name: /Sounds good|Tap to go home/ })
  await success.or(error).first().waitFor({ state: 'visible', timeout: 60000 })
  if (await error.isVisible()) throw new Error(await error.innerText())
  await dismissPaymentSuccess(alice.page, Math.max(1, deadline - Date.now()))
}

export async function claim(bob: Actor, plan: RegExp | string) {
  await expect(bob.page.getByText('Claim your Taxi delivery', { exact: true })).toBeVisible()
  await expect(bob.page.getByTestId('claim-plan')).toHaveText(plan)
  await bob.page.getByRole('dialog').getByRole('button', { name: 'Claim', exact: true }).click()
  await expect(bob.page.getByText('Claim your Taxi delivery', { exact: true })).not.toBeVisible()
  const success = bob.page.getByRole('button', { name: /Sounds good|Tap to go home/ })
  if (await success.isVisible()) await success.click()
}

export async function mint(alice: Actor) {
  await enableAssets(alice.page)
  const page = alice.page
  await assetScreen(page, tr.settings.arkadeMint).getByRole('button', { name: tr.mint.mint, exact: true }).click()
  await page.getByTestId('asset-amount').fill('20')
  await page.getByTestId('asset-name').fill('Taxi regtest XYZ')
  await page.getByTestId('asset-ticker').fill('XYZ')
  await page.getByTestId('asset-decimals').fill('0')
  await assetScreen(page, tr.mint.title).getByRole('button', { name: tr.mint.mint, exact: true }).click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 10_000 })
  await page.getByText(tr.mint.assetMinted, { exact: true }).waitFor({ timeout: 60_000 })
  return (await alice.page.getByTestId(/^asset-row-XYZ-/).getAttribute('data-testid'))!.slice('asset-row-XYZ-'.length)
}

export async function importAsset(bob: Actor, assetId: string) {
  await enableAssets(bob.page)
  await navigateToAssets(bob.page)
  await assetScreen(bob.page, tr.settings.arkadeMint).getByRole('button', { name: tr.mint.import, exact: true }).click()
  await bob.page.locator('input[name="asset-id"]').fill(assetId)
  await assetScreen(bob.page, tr.mint.importAsset).getByRole('button', { name: tr.mint.import, exact: true }).click()
  await bob.page.getByText(tr.mint.assetIdTapToCopy, { exact: true }).first().waitFor()
}

export function rule(assetId: string | null) {
  const id = assetId === null ? null : asset.AssetId.fromString(assetId)
  return {
    assetId: id === null ? null : { txid: hex.encode(Uint8Array.from(id.txid).reverse()), groupIndex: id.groupIndex },
    enabled: true,
    claim: 'either',
    maxTopupSats: null,
    fares: [
      { id: 'sats', currency: { kind: 'sats' }, pricing: { kind: 'flat', units: '0' } },
      ...(assetId === null
        ? []
        : [{ id: 'asset', currency: { kind: 'sameAsset' }, pricing: { kind: 'flat', units: '1' } }]),
    ],
  }
}

export type Policy = { assetRules: Awaited<ReturnType<TaxiClient['info']>>['assetRules']; paused: boolean }
export const restorePolicy = (policy: Policy) =>
  admin('policy', 'PATCH', {
    paused: policy.paused,
    assetRules: policy.assetRules.map((rule) => ({
      assetId: rule.assetId,
      enabled: rule.enabled,
      claim: rule.claim,
      maxTopupSats: rule.maxTopupSats,
      fares: rule.fares.map((fare) => ({
        id: fare.id,
        pricing: fare.pricing,
        currency: { kind: fare.currency, ...(fare.currency === 'token' ? { assetId: fare.assetId } : {}) },
      })),
    })),
  })

const assetScreen = (page: Page, title: string) =>
  page
    .locator('.header')
    .filter({ has: page.getByText(title, { exact: true }) })
    .locator('..')

async function enableAssets(page: Page) {
  await navigateToAssets(page)
  await page.locator('.header').filter({ hasText: tr.settings.arkadeMint }).getByTestId('header-aux-btn').click()
  await expect(page.getByTestId('assets-toggle')).toBeVisible()
  await page.getByTestId('assets-toggle').click()
  await expect(page.getByTestId('assets-toggle')).not.toBeVisible()
  await expect(page.getByRole('button', { name: tr.mint.mint, exact: true })).toBeVisible()
}
