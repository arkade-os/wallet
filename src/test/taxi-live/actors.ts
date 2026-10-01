import { expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import {
  ArkAddress,
  InMemoryContractRepository,
  InMemoryIntentRepository,
  InMemoryVirtualTxRepository,
  InMemoryWalletRepository,
  RestIndexerProvider,
  SingleKey,
  Wallet,
  asset,
  configureEventSource,
} from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { EventSource } from 'eventsource'
import type { TaxiClient } from '@arkade-taxi/client'
import {
  dismissPaymentSuccess,
  enableAssets,
  navigateHome,
  navigateToAssets,
  receiveOffchain,
  waitForPaymentReceived,
} from '../e2e/utils'
import { translations } from '../../lib/i18n'

export const tr = translations.en
export type Actor = { name: string; page: Page; address: string }
export type Holdings = { sats: string; units: string }
export type TaxiPolicy = {
  assetRules: Awaited<ReturnType<TaxiClient['info']>>['assetRules']
  quoteTtlSeconds: number
}

export function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required by the local Taxi regtest harness`)
  return value
}

export async function faucetWallet(): Promise<Wallet> {
  const { sender } = JSON.parse(readFileSync(required('TAXI_E2E_SECRET_FILE'), 'utf8')) as { sender: string }
  configureEventSource((url) => new EventSource(url))
  return Wallet.create({
    identity: SingleKey.fromHex(sender),
    arkServerUrl: required('TAXI_E2E_ARKD_URL'),
    esploraUrl: required('ARKADE_ESPLORA_URL'),
    settlementConfig: false,
    storage: {
      walletRepository: new InMemoryWalletRepository(),
      contractRepository: new InMemoryContractRepository(),
      intentRepository: new InMemoryIntentRepository(),
      virtualTxRepository: new InMemoryVirtualTxRepository(),
    },
  })
}

export async function onboard(name: string, page: Page): Promise<Actor> {
  await page.goto('/')
  await page.getByText(`+ ${tr.init.createWallet}`, { exact: true }).click()
  await expect(page.getByTestId('home-action-receive')).toBeVisible()
  await expect(page.getByText('Continue anyway', { exact: true })).not.toBeVisible()
  const address = await receiveOffchain(page)
  await navigateHome(page)
  return { name, page, address }
}

export async function holdings(address: string, assetId: string): Promise<Holdings> {
  const indexer = new RestIndexerProvider(required('TAXI_E2E_ARKD_URL'))
  const { vtxos } = await indexer.getVtxos({
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

export async function fund(faucet: Wallet, actor: Actor, sats: number): Promise<void> {
  expect(await receiveOffchain(actor.page)).toBe(actor.address)
  await faucet.send({ address: actor.address, amount: sats })
  await waitForPaymentReceived(actor.page)
  await navigateHome(actor.page)
}

export async function admin<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${required('TAXI_E2E_ADMIN_URL')}/admin/api/${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-taxi-operator': 'task13-e2e' },
    ...(method === 'GET' ? {} : { body: JSON.stringify(body ?? {}) }),
  })
  const payload = await response.json().catch(() => {
    throw new Error(`Taxi admin ${path}: HTTP ${response.status}: Invalid JSON response`)
  })
  if (!response.ok) {
    const reason = typeof payload.error === 'string' ? payload.error.slice(0, 512) : 'Invalid admin response'
    throw new Error(`Taxi admin ${path}: HTTP ${response.status}: ${reason}`)
  }
  return payload as T
}

export function policyRulesForPatch(rules: TaxiPolicy['assetRules']) {
  return rules.map((rule) => ({
    assetId: rule.assetId,
    enabled: rule.enabled,
    claim: rule.claim,
    maxTopupSats: rule.maxTopupSats,
    fares: rule.fares.map((fare) => ({
      id: fare.id,
      currency: { kind: fare.currency, ...(fare.currency === 'token' ? { assetId: fare.assetId } : {}) },
      pricing: fare.pricing,
    })),
  }))
}

export async function control(action: string, rule?: unknown): Promise<void> {
  const response = await fetch(required('TAXI_E2E_CONTROL_URL'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, rule }),
  })
  if (!response.ok) throw new Error(`Regtest proxy ${action}: HTTP ${response.status}`)
}

export function xyzRule(assetId: string) {
  const id = asset.AssetId.fromString(assetId)
  return {
    assetId: { txid: hex.encode(Uint8Array.from(id.txid).reverse()), groupIndex: id.groupIndex },
    enabled: true,
    claim: 'either',
    maxTopupSats: null,
    fares: [
      { id: 'receiver-sats', currency: { kind: 'sats' }, pricing: { kind: 'flat', units: '0' } },
      { id: 'receiver-asset', currency: { kind: 'sameAsset' }, pricing: { kind: 'flat', units: '1' } },
    ],
  }
}

export async function importAsset(actor: Actor, assetId: string): Promise<void> {
  await enableAssets(actor.page)
  await navigateToAssets(actor.page)
  await actor.page.getByRole('button', { name: tr.mint.import, exact: true }).click()
  await actor.page.locator('input[name="asset-id"]').fill(assetId)
  await actor.page.getByRole('button', { name: tr.mint.import, exact: true }).click()
  await actor.page.getByText(tr.mint.assetIdTapToCopy, { exact: true }).first().waitFor()
}

export async function receiveRequest(bob: Actor, assetId: string): Promise<string> {
  const page = bob.page
  await navigateToAssets(page)
  await page.getByTestId(`asset-row-XYZ-${assetId}`).click()
  await page.getByRole('button', { name: tr.mint.receive, exact: true }).click()
  await page.getByRole('button', { name: tr.receive.addAmount, exact: true }).click()
  await page.locator('input[name="receive-amount-sheet"]').fill('1')
  await page.getByRole('button', { name: tr.receive.setAmount, exact: true }).click()
  await page.getByRole('button', { name: 'Taxi: off', exact: true }).click()
  await page.getByRole('option', { name: 'receiver-sats · 0 sats', exact: true }).click()
  await expect(page.getByTestId('bip21')).toContainText('taxifare=receiver-sats')
  const request = await page.getByTestId('bip21').textContent()
  expect(request).toContain(`assetid=${assetId}&amount=1`)
  expect(request).toContain('taxifare=receiver-sats')
  await navigateHome(page)
  return request!
}

export async function prepareSend(alice: Actor, request: string, mode?: string, amount = '1'): Promise<void> {
  const page = alice.page
  await navigateHome(page)
  await page.getByText(tr.wallet.send, { exact: true }).click()
  await page.locator('input[name="send-address"]').fill(request)
  await expect(page.locator('input[name="send-amount"]')).toHaveValue('1')
  if (amount !== '1') await page.locator('input[name="send-amount"]').fill(amount)
  if (mode) {
    await page.getByTestId('taxi-send-mode').click()
    await page.getByRole('menuitem', { name: mode, exact: true }).click()
  }
  await page.getByRole('button', { name: tr.common.continue, exact: true }).click()
}

export async function confirmSend(alice: Actor, taxi: boolean): Promise<void> {
  if (taxi) await taxiConfirmation(alice)
  await alice.page.getByRole('button', { name: taxi ? 'Pay' : tr.send.tapToSign, exact: true }).click()
  await dismissPaymentSuccess(alice.page)
}

export async function taxiConfirmation(alice: Actor): Promise<void> {
  const costs = alice.page.getByTestId('taxi-confirm-costs')
  const error = alice.page.getByTestId('error-message')
  await costs.or(error).first().waitFor({ state: 'visible' })
  if (await error.isVisible()) throw new Error(`Alice Taxi send: ${await error.innerText()}`)
  await expect(costs).toContainText('330')
}

export async function claim(bob: Actor, plan: RegExp): Promise<void> {
  await expect(bob.page.getByText('Claim your Taxi delivery', { exact: true })).toBeVisible()
  await expect(bob.page.getByTestId('claim-plan')).toContainText(plan)
  await bob.page.getByRole('button', { name: 'Claim', exact: true }).click()
  await expect(bob.page.getByText('Claim your Taxi delivery', { exact: true })).not.toBeVisible()
  const success = bob.page.getByRole('button', { name: /Sounds good|Tap to go home/ })
  if (await success.isVisible().catch(() => false)) await success.click()
}
