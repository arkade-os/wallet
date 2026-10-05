import {
  expect,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type Locator,
  type Page,
  type TestInfo,
} from '@playwright/test'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import {
  ArkAddress,
  DefaultVtxo,
  DelegateVtxo,
  InMemoryContractRepository,
  InMemoryIntentRepository,
  InMemoryVirtualTxRepository,
  InMemoryWalletRepository,
  RestArkProvider,
  RestIndexerProvider,
  SingleKey,
  Wallet,
  asset,
  configureEventSource,
  getNetwork,
  toXOnlySignerHex,
  type NetworkName,
} from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { EventSource } from 'eventsource'
import type { TaxiClient } from '@arkade-taxi/client'
import {
  dismissPaymentSuccess,
  enableAssets,
  handleKeyboardInput,
  mintAsset,
  navigateHome,
  navigateToAssets,
  receiveOffchain,
  waitForPaymentReceived,
} from '../e2e/utils'
import { translations } from '../../lib/i18n'
import { decodeBip21 } from '../../lib/bip21'

export const tr = translations.en
export type Actor = { name: string; page: Page; address: string }
export type Holdings = { sats: string; units: string }
export type Ledger = Record<string, Holdings>
export type TaxiPolicy = {
  assetRules: Awaited<ReturnType<TaxiClient['info']>>['assetRules']
  quoteTtlSeconds: number
  paused: boolean
}
export type Advance = {
  id: string
  state: string
  kind: 'covenant' | 'sponsored'
  receiverKey: string
  dust: string
  topup: string
  assetId?: { txid: string; groupIndex: number }
  outpoint?: { txid: string; vout: number }
  spentTxid?: string
  submissionPhase?: string
  failureCode?: string
  failureDetail?: string
}
export type TaxiStatus = Pick<
  Advance,
  'state' | 'outpoint' | 'spentTxid' | 'submissionPhase' | 'failureCode' | 'failureDetail'
> & {
  transferId: string
  updatedAt: number
}

export function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required by the local Taxi regtest harness`)
  return value
}

export async function faucetWallet(): Promise<Wallet> {
  const { sender } = JSON.parse(readFileSync(required('TAXI_E2E_SECRET_FILE'), 'utf8')) as { sender: string }
  configureEventSource((url) => new EventSource(url))
  const faucet = await Wallet.create({
    identity: SingleKey.fromHex(sender),
    arkServerUrl: required('TAXI_E2E_ARKD_URL'),
    esploraUrl: required('ARKADE_ESPLORA_URL'),
    settlementConfig: false,
    delegateProvider: {
      getDelegateInfo: async () => ({
        pubkey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
        fee: '0',
        delegateAddress: '',
      }),
      delegate: async () => {
        throw new Error('the e2e stub delegate provider never delegates')
      },
    },
    storage: {
      walletRepository: new InMemoryWalletRepository(),
      contractRepository: new InMemoryContractRepository(),
      intentRepository: new InMemoryIntentRepository(),
      virtualTxRepository: new InMemoryVirtualTxRepository(),
    },
  })
  const fixture = JSON.parse(readFileSync(required('TAXI_E2E_FIXTURE_FILE'), 'utf8')) as {
    sender: { address: string }
  }
  expect(await faucet.getAddress()).toBe(fixture.sender.address)
  return faucet
}

export async function onboard(
  name: string,
  page: Page,
  { leaves = 2, autoClaimFreeTaxi = false }: { leaves?: 2 | 3; autoClaimFreeTaxi?: boolean } = {},
): Promise<Actor> {
  // Persisted config outranks the build's VITE_DELEGATE_ENABLED, so this is how one actor picks its leaves.
  // Manual claim scenes opt out explicitly; queue scenes opt in through the same persisted setting.
  await page.addInitScript(
    ({ delegate, autoClaimFreeTaxi }) => {
      const config = JSON.parse(localStorage.getItem('config') ?? '{}')
      localStorage.setItem(
        'config',
        JSON.stringify({ ...config, currency: 'BTC', unit: 'sats', delegate, autoClaimFreeTaxi }),
      )
    },
    { delegate: leaves === 3, autoClaimFreeTaxi },
  )
  await page.goto('/')
  await page.getByText(`+ ${tr.init.createWallet}`, { exact: true }).click()
  await expect(page.getByTestId('home-action-receive')).toBeVisible()
  await expect(page.getByText('Continue anyway', { exact: true })).not.toBeVisible()
  const address = await receiveOffchain(page)
  await navigateHome(page)
  return { name, page, address }
}

const xOnly = (key: string) => hex.decode(toXOnlySignerHex(key))

/** Rebuilds the receive address from the wallet's own key: the SDK falls back to 2 leaves silently. */
export async function expectLeaves(
  actor: Actor,
  leaves: 2 | 3,
  arkdUrl = required('TAXI_E2E_ARKD_URL'),
  delegatePubkey?: string,
): Promise<void> {
  const pubkey = await actor.page.evaluate(() => JSON.parse(localStorage.getItem('config') ?? '{}').pubkey as string)
  const info = await new RestArkProvider(arkdUrl).getInfo()
  const serverPubKey = xOnly(info.signerPubkey)
  const delay = info.unilateralExitDelay
  const options = {
    pubKey: xOnly(pubkey),
    serverPubKey,
    csvTimelock: { value: delay, type: delay < 512n ? ('blocks' as const) : ('seconds' as const) },
  }
  const script =
    leaves === 2
      ? new DefaultVtxo.Script(options)
      : new DelegateVtxo.Script({
          ...options,
          delegatePubKey: xOnly(delegatePubkey ?? required('TAXI_E2E_DELEGATE_PUBKEY')),
        })
  expect(script.address(getNetwork(info.network as NetworkName).hrp, serverPubKey).encode()).toBe(actor.address)
}

export async function holdings(
  address: string,
  assetId: string,
  arkdUrl = required('TAXI_E2E_ARKD_URL'),
): Promise<Holdings> {
  const indexer = new RestIndexerProvider(arkdUrl)
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

export async function ledger(parties: Record<string, string>, assetId: string, arkdUrl?: string): Promise<Ledger> {
  const entries = await Promise.all(
    Object.entries(parties).map(async ([name, address]) => [name, await holdings(address, assetId, arkdUrl)] as const),
  )
  return Object.fromEntries(entries)
}

export async function expectLedger(
  parties: Record<string, string>,
  assetId: string,
  expected: Ledger,
  arkdUrl?: string,
): Promise<void> {
  await expect(async () => expect(await ledger(parties, assetId, arkdUrl)).toEqual(expected)).toPass({
    timeout: 90_000,
    intervals: [250, 500, 1000],
  })
}

export const shift = ({ sats, units }: Holdings, deltaSats: bigint, deltaUnits = 0n): Holdings => ({
  sats: (BigInt(sats) + deltaSats).toString(),
  units: (BigInt(units) + deltaUnits).toString(),
})

export const operatorAddress = (): string =>
  (JSON.parse(readFileSync(required('TAXI_E2E_FIXTURE_FILE'), 'utf8')) as { operator: { address: string } }).operator
    .address

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

export const advances = async (): Promise<Advance[]> => (await admin<{ advances: Advance[] }>('advances')).advances

async function operationalEvidence() {
  const read = async (url: string): Promise<Record<string, unknown>> => {
    try {
      const response = await fetch(url, {
        headers: { 'x-taxi-operator': 'task13-e2e' },
        signal: AbortSignal.timeout(3_000),
      })
      return response.ok ? await response.json() : { unavailable: true, status: response.status }
    } catch {
      return { unavailable: true }
    }
  }
  const pick = (value: Record<string, unknown>, paths: string[]) =>
    Object.fromEntries(
      paths.map((path) => [
        path,
        path
          .split('.')
          .reduce<unknown>((row, key) => (row && typeof row === 'object' ? Reflect.get(row, key) : null), value),
      ]),
    )
  const [health, status, history] = await Promise.all([
    read(`${required('TAXI_E2E_BASE_URL')}/health`),
    read(`${required('TAXI_E2E_ADMIN_URL')}/admin/api/status`),
    read(`${required('TAXI_E2E_ADMIN_URL')}/admin/api/policy/history?limit=100`),
  ])
  const fields = (
    'unavailable status paused now blockers startup.phase startup.complete startup.blocker ' +
    'runtime.checkedAt runtime.walletSynced runtime.providerIdentityOk runtime.blockers ' +
    'sweeper.lastTickAt sweeper.failedTotal sweeper.lockedCount sweeper.recoveringCount ' +
    'reconciler.lastTickAt reconciler.lastWatcherScanAt reconciler.watching reconciler.blockers'
  ).split(' ')
  const pauseHistory = Array.isArray(history.history)
    ? (history.history as Record<string, unknown>[])
        .filter((row) => row?.field === 'paused')
        .map(({ id, changedAt, oldValue, newValue, actor }) => ({
          id,
          changedAt,
          oldValue,
          newValue,
          actor: ['spend-watcher', 'recovery-deadline', 'submission', 'recovery', 'lockup-reconciler'].includes(
            String(actor),
          )
            ? actor
            : 'operator',
        }))
    : { unavailable: true }
  return {
    observedAt: Date.now(),
    health: pick(health, fields),
    status: pick(status, [
      ...'unavailable status now paused sweeper.running sweeper.healthy sweeper.intervalMs sweeper.staleAfterMs sweeper.lastTickAt'.split(
        ' ',
      ),
      ...fields.map((field) => `readiness.${field}`),
    ]),
    pauseHistory,
  }
}

export async function newAdvances(before: Advance[], list = advances): Promise<Advance[]> {
  const known = new Set(before.map(({ id }) => id))
  return (await list()).filter(({ id }) => !known.has(id))
}

export async function newAdvance(before: Advance[], list = advances): Promise<Advance> {
  const fresh = await newAdvances(before, list)
  expect(fresh).toHaveLength(1)
  return fresh[0]
}

export async function taxiStatus(id: string, base = required('TAXI_E2E_BASE_URL'), sponsored = false) {
  const response = await fetch(`${base}/v1/${sponsored ? 'sponsored-transfers' : 'transfers'}/${id}`)
  if (!response.ok) throw new Error(`Taxi transfer ${id}: HTTP ${response.status}`)
  return (await response.json()) as TaxiStatus
}

export async function taxiReady(base = required('TAXI_E2E_BASE_URL')): Promise<boolean> {
  return (await fetch(`${base}/ready`)).ok
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

const restorable = (policy: TaxiPolicy) => ({
  assetRules: policyRulesForPatch(policy.assetRules),
  quoteTtlSeconds: policy.quoteTtlSeconds,
  paused: policy.paused,
})

export async function control<T = unknown>(action: string, rule?: unknown): Promise<T> {
  const response = await fetch(required('TAXI_E2E_CONTROL_URL'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, rule }),
  })
  if (!response.ok) throw new Error(`Regtest proxy ${action}: HTTP ${response.status}`)
  return (await response.json()) as T
}

/** Patches the Taxi for one step; the policy and the proxy are restored even when the step fails. */
export async function withPolicy<T>(patch: Record<string, unknown>, step: () => Promise<T>): Promise<T> {
  const policy = await admin<TaxiPolicy>('policy')
  await admin('policy', 'PATCH', patch)
  try {
    return await step()
  } finally {
    await control('reset')
    await admin('policy', 'PATCH', restorable(policy))
  }
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

/** A rule on mutinynet's live terms: recycle only, and one sats fare of 0. */
export const satsRule = (assetId: null | '*', overrides: Record<string, unknown> = {}) => ({
  assetId,
  enabled: true,
  claim: 'recycle',
  maxTopupSats: null,
  fares: [{ id: 'sats', currency: { kind: 'sats' }, pricing: { kind: 'flat', units: '0' } }],
  ...overrides,
})

export async function mintXyz(actor: Actor): Promise<string> {
  await enableAssets(actor.page)
  await mintAsset(actor.page, { amount: '20', name: `Taxi ${actor.name} XYZ`, ticker: 'XYZ', decimals: 0 })
  const rowId = await actor.page.getByTestId(/^asset-row-XYZ-/).getAttribute('data-testid')
  return rowId!.slice('asset-row-XYZ-'.length)
}

export async function importAsset(actor: Actor, assetId: string): Promise<void> {
  const enabled = await actor.page.evaluate(() =>
    Boolean(JSON.parse(localStorage.getItem('config') ?? '{}').apps?.assets?.enabled),
  )
  if (!enabled) await enableAssets(actor.page)
  await navigateToAssets(actor.page)
  await actor.page.getByRole('button', { name: tr.mint.import, exact: true }).click()
  await actor.page.locator('input[name="asset-id"]').fill(assetId)
  await actor.page.getByRole('button', { name: tr.mint.import, exact: true }).click()
  await actor.page.getByText(tr.mint.assetIdTapToCopy, { exact: true }).first().waitFor()
}

export async function enterReceiveAmount(page: Page, amount: string): Promise<void> {
  await page.getByRole('button', { name: tr.receive.addAmount, exact: true }).click()
  // The wallet's own isMobileBrowser test: a touch screen gets its keyboard, not the amount sheet.
  if (await page.evaluate(() => 'ontouchstart' in window || navigator.maxTouchPoints > 0))
    return handleKeyboardInput(page, Number(amount))
  await page.locator('input[name="receive-amount-sheet"]').fill(amount)
  await page.getByRole('button', { name: tr.receive.setAmount, exact: true }).click()
}

export async function openAssetReceive(actor: Actor, assetId: string, amount = '1'): Promise<void> {
  await navigateToAssets(actor.page)
  await actor.page.getByTestId(`asset-row-XYZ-${assetId}`).click()
  await actor.page.getByRole('button', { name: tr.mint.receive, exact: true }).click()
  await enterReceiveAmount(actor.page, amount)
}

export async function receiveRequest(
  bob: Actor,
  assetId: string,
  fare: string | null = 'receiver-sats',
  amount = '1',
  payer: 'receiver' | 'sender' | 'legacy' = 'receiver',
): Promise<string> {
  const page = bob.page
  await openAssetReceive(bob, assetId, amount)
  if (fare || payer === 'sender') {
    await page.getByRole('button', { name: /Taxi delivery/ }).click()
    const choice =
      payer === 'sender' ? 'Sender covers carrier' : payer === 'legacy' ? 'No Taxi' : /^I have sats(?: · Free)?$/
    if (payer === 'legacy')
      await expect(page.getByRole('radio', { name: /^I have sats(?: · Free)?$/, exact: true })).toBeDisabled()
    await page.getByRole('radio', { name: choice, exact: true }).click()
    if (payer !== 'legacy') {
      await expect
        .poll(async () => decodeBip21((await page.getByTestId('bip21').textContent())!))
        .toMatchObject({
          taxi: { payer },
        })
    }
  }
  let request = (await page.getByTestId('bip21').textContent())!
  expect(request).toContain(`assetid=${assetId}&amount=${amount}`)
  expect(request).not.toContain('taxikey=')
  if (payer === 'legacy') {
    request += `&taxi=${encodeURIComponent(required('TAXI_E2E_BASE_URL'))}&taxifare=${fare}`
    expect(decodeBip21(request).taxi).toMatchObject({ fareId: fare })
    expect(decodeBip21(request).taxi?.payer).toBeUndefined()
  }
  await navigateHome(page)
  return request
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
    await page.getByRole('radio', { name: mode, exact: true }).click()
  }
  await page.getByRole('button', { name: tr.common.continue, exact: true }).click()
}

/** Opens Send for a bitcoin amount, typed unless the request already carries it, and stops before Continue. */
export async function openSatsSend(alice: Actor, recipient: string, sats: number, mode?: string): Promise<void> {
  const page = alice.page
  await navigateHome(page)
  await page.getByText(tr.wallet.send, { exact: true }).click()
  await page.locator('input[name="send-address"]').fill(recipient)
  const amount = page.locator('input[name="send-amount"]')
  if (!recipient.includes('amount=')) await amount.fill(String(sats))
  await expect(amount).toHaveValue(String(sats))
  if (mode) {
    await page.getByTestId('taxi-send-mode').click()
    await page.getByRole('radio', { name: mode, exact: true }).click()
  }
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

export async function claim(bob: Actor, plan: string | RegExp): Promise<void> {
  await expect(bob.page.getByText('Claim your Taxi delivery', { exact: true })).toBeVisible()
  await expect(bob.page.getByTestId('claim-plan')).toHaveText(plan)
  await bob.page.getByRole('button', { name: 'Claim', exact: true }).click()
  await expect(bob.page.getByText('Claim your Taxi delivery', { exact: true })).not.toBeVisible()
  const success = bob.page.getByRole('button', { name: /Sounds good|Tap to go home/ })
  if (await success.isVisible().catch(() => false)) await success.click()
}

export const sheet = (page: Page) => page.getByRole('dialog')

export async function declineClaims(page: Page): Promise<void> {
  const notNow = sheet(page).getByRole('button', { name: 'Not now', exact: true })
  if (await notNow.isVisible().catch(() => false)) await notNow.click()
}

// Every Taxi row's meta line leads with its state; one the poller may already have moved is a RegExp alternation.
export async function taxiRows(actor: Actor, state: string | RegExp) {
  await declineClaims(actor.page)
  await navigateHome(actor.page)
  await actor.page.getByTestId('activity-view-all').click()
  const leads = new RegExp(`^(?:${typeof state === 'string' ? state : state.source}) · `)
  return actor.page.getByTestId('tx-row').filter({ has: actor.page.locator('.activity-row__meta', { hasText: leads }) })
}

// hasText matches what an ellipsis hides too, so measure where the leading state ends.
export async function expectStateShown(row: Locator): Promise<void> {
  const shown = await row.locator('.activity-row__meta').evaluate((meta) => {
    const text = meta.firstChild as Text
    const state = document.createRange()
    state.setStart(text, 0)
    state.setEnd(text, text.data.split(' · ')[0].length)
    const context = document.createElement('canvas').getContext('2d')!
    context.font = getComputedStyle(meta).font
    const edge = meta.getBoundingClientRect().right - context.measureText('…').width
    return meta.scrollWidth <= meta.clientWidth || state.getBoundingClientRect().right <= edge
  })
  expect(shown).toBe(true)
}

export async function openTaxiRow(actor: Actor, state: string | RegExp): Promise<void> {
  const row = await taxiRows(actor, state)
  await expect(row).toHaveCount(1)
  await expectStateShown(row)
  await row.click()
  await expect(actor.page.getByTestId('Transfer ID')).toBeVisible()
}

export async function claimFromActivity(bob: Actor): Promise<void> {
  const delivery = await taxiRows(bob, 'Claimable')
  await expect(delivery).toHaveCount(1)
  await delivery.click()
  const sheetOpen = await sheet(bob.page)
    .isVisible()
    .catch(() => false)
  if (!sheetOpen) await bob.page.getByRole('button', { name: 'Claim', exact: true }).click()
  await sheet(bob.page).getByRole('button', { name: 'Claim', exact: true }).click()
  await expect(sheet(bob.page)).not.toBeVisible()
  const success = bob.page.getByRole('button', { name: /Sounds good|Tap to go home/ })
  if (await success.isVisible().catch(() => false)) await success.click()
}

/** A1: Alice pays Bob one unit, Bob merges it into his own coin, and the Taxi gets its carrier back. */
export async function recycleOne(alice: Actor, bob: Actor, assetId: string, request?: string): Promise<Advance> {
  const parties = { alice: alice.address, bob: bob.address, taxi: operatorAddress() }
  const known = await advances()
  const before = await ledger(parties, assetId)
  await prepareSend(alice, request ?? (await receiveRequest(bob, assetId)), 'Receiver uses own sats')
  await confirmSend(alice, true)
  const advance = await newAdvance(known)
  await claim(bob, /^Your sats balance stays unchanged: your [\d,]+ sats coin comes back whole\.$/)
  await expectLedger(parties, assetId, {
    alice: shift(before.alice, 0n, -1n),
    bob: shift(before.bob, 0n, 1n),
    taxi: before.taxi,
  })
  await expect.poll(async () => (await taxiStatus(advance.id)).state).toBe('recycled')
  return advance
}

const TERMINAL = ['recycled', 'purchased', 'refunded', 'recovered', 'expired']
// A sponsored transfer settles at locked: nothing is left to claim or recover.
const isTerminal = ({ kind, state }: Advance) =>
  TERMINAL.includes(state) || (kind === 'sponsored' && state === 'locked')

export type Stage = {
  faucet: Wallet
  evidence: Record<string, unknown>
  join: (
    name: string,
    options?: { leaves?: 2 | 3; device?: BrowserContextOptions; sats?: number; autoClaimFreeTaxi?: boolean },
  ) => Promise<Actor>
}

/** Fresh wallets for one scene; afterwards the Taxi is restored, and every advance the scene made must be terminal,
 * because the SDK suite runs next on the same stack. */
export async function stage(browser: Browser, testInfo: TestInfo, play: (s: Stage) => Promise<void>): Promise<void> {
  const faucet = await faucetWallet()
  await control('reset')
  const evidence: Record<string, unknown> = {
    operationalBefore: await operationalEvidence().catch(() => ({ unavailable: true })),
  }
  const policy = await admin<TaxiPolicy>('policy')
  const known = await advances()
  const contexts: BrowserContext[] = []
  let guardEvidence: Promise<unknown> | undefined
  const join: Stage['join'] = async (name, { leaves, device, sats, autoClaimFreeTaxi } = {}) => {
    const context = await browser.newContext({
      ...device,
      baseURL: testInfo.project.use.baseURL,
      permissions: ['clipboard-read', 'clipboard-write'],
      locale: 'en-US',
      reducedMotion: 'reduce',
    })
    contexts.push(context)
    const actor = await onboard(name, await context.newPage(), { leaves, autoClaimFreeTaxi })
    actor.page.on('response', (response) => {
      const path = new URL(response.url()).pathname
      if (!guardEvidence && response.status() === 503 && /^\/(taxi\/)?v1\/(transfers|sponsored-transfers)/.test(path)) {
        evidence.firstGuard = { observedAt: Date.now(), path }
        guardEvidence = operationalEvidence().catch(() => ({ unavailable: true }))
      }
    })
    if (sats) await fund(faucet, actor, sats)
    return actor
  }
  let failed = false
  try {
    await play({ faucet, evidence, join })
  } catch (error) {
    failed = true
    evidence.operationalFailure = await operationalEvidence().catch(() => ({ unavailable: true }))
    throw error
  } finally {
    if (guardEvidence) evidence.operationalGuard = await guardEvidence
    const errors: string[] = []
    const open = async () => (await newAdvances(known)).filter((advance) => !isTerminal(advance))
    for (const cleanup of [
      () => control('reset'),
      () => admin('policy', 'PATCH', restorable(policy)),
      async () => {
        if (failed) return
        await expect
          .poll(async () => (await open()).map(({ id, kind, state }) => `${id} ${kind} ${state}`), { timeout: 180_000 })
          .toEqual([])
      },
      async () => {
        evidence.advances = await newAdvances(known)
      },
      () => faucet.dispose(),
      ...contexts.map((context) => () => context.close()),
    ]) {
      try {
        await cleanup()
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Cleanup failed')
      }
    }
    try {
      const directory = resolve(process.env.TAXI_E2E_WALLET_ARTIFACTS || 'test-results/taxi-live')
      mkdirSync(directory, { recursive: true })
      const path = resolve(directory, `${basename(testInfo.file, '.e2e.ts')}-${testInfo.testId}-evidence.json`)
      writeFileSync(path, `${JSON.stringify({ ...evidence, cleanupErrors: errors }, null, 2)}\n`)
      await testInfo.attach('Taxi advances and balances', { path, contentType: 'application/json' })
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Evidence write failed')
    }
    if (errors.length && !failed) throw new Error(`Regtest cleanup: ${errors.join('; ')}`)
  }
}
