import { chromium, expect, test, type Browser, type BrowserContext } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ArkAddress, type Wallet } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { decodeBip21 } from '../../lib/bip21'
import { dismissPaymentSuccess, navigateHome } from '../e2e/utils'
import {
  claim,
  claimFromActivity,
  enterReceiveAmount,
  expectLeaves,
  holdings,
  importAsset,
  ledger,
  mintXyz,
  onboard,
  openSatsSend,
  prepareSend,
  receiveRequest,
  sheet,
  shift,
  taxiRows,
  tr,
  type Actor,
} from '../taxi-live/actors'
import {
  ARKD,
  TAXI,
  adminGet,
  coinSpent,
  funderWallet,
  ownedAssets,
  ownTransfer,
  preflight,
  recoverySecret,
  resolveRunMint,
  safeMessage,
  satsRequest,
  status,
  signingWallet,
  sweep,
  sweepSdk,
} from './actors'
import { assertNoSecrets, reserveFunding } from './safety'

test('Chrome sender and Edge receiver: exact bitcoin, asset recycle, claims, history and refusals', async ({
  browser,
}, testInfo) => {
  if (!testInfo.project.use.baseURL) throw new Error('Set TAXI_LIVE_WALLET_URL or TAXI_LIVE_LOCAL=1')
  const { info, delegate } = await preflight()
  const funder = await funderWallet(delegate)
  let funderAddress = ''
  let edge: Browser | undefined
  const contexts: BrowserContext[] = []
  const actors: Actor[] = []
  const recoveryWallets = new Map<string, Wallet>()
  const secrets: string[] = []
  const transfers: Awaited<ReturnType<typeof ownTransfer>>[] = []
  const requests: { method: string; path: string }[] = []
  const evidence: Record<string, unknown> = { fundedSats: 0, transfers, requests, browsers: ['chrome', 'msedge'] }
  const cleanupErrors: string[] = []
  let funded = 0
  let assetId = ''
  const join = async (name: string, sats: number): Promise<Actor> => {
    const context = await (name === 'Bob' ? edge! : browser).newContext({
      baseURL: testInfo.project.use.baseURL,
      permissions: ['clipboard-read', 'clipboard-write'],
      locale: 'en-US',
      reducedMotion: 'reduce',
    })
    contexts.push(context)
    context.on('request', (request) => {
      if (request.url().startsWith(`${TAXI}/`) && request.method() !== 'GET')
        requests.push({ method: request.method(), path: new URL(request.url()).pathname })
    })
    const actor = await onboard(name, await context.newPage(), { leaves: 3 })
    actors.push(actor)
    await expectLeaves(actor, 3, ARKD, delegate.pubkey)
    const secret = await recoverySecret(actor)
    secrets.push(secret)
    const recovery = await signingWallet(secret, delegate)
    recoveryWallets.set(actor.address, recovery)
    expect(await recovery.getAddress()).toBe(actor.address)
    expect((await holdings(actor.address, '', ARKD)).sats).toBe('0')
    funded = reserveFunding(funded, sats)
    evidence.fundedSats = funded
    await preflight()
    try {
      await funder.send({ address: actor.address, amount: sats })
    } catch {
      throw new Error(`Funding ${name} failed; do not rerun without checking run evidence`)
    }
    await expect.poll(async () => (await holdings(actor.address, '', ARKD)).sats).toBe(String(sats))
    const success = actor.page.getByRole('button', { name: /Sounds good|Tap to go home/ })
    if (await success.isVisible().catch(() => false)) await success.click()
    await navigateHome(actor.page)
    return actor
  }
  try {
    funderAddress = await funder.getAddress()
    if (process.env.TAXI_LIVE_FUNDER_ADDRESS) expect(funderAddress).toBe(process.env.TAXI_LIVE_FUNDER_ADDRESS)
    const funderBefore = await holdings(funderAddress, '', ARKD)
    expect(BigInt(funderBefore.sats)).toBeGreaterThanOrEqual(5_000n)
    evidence.funderBefore = { address: funderAddress, sats: funderBefore.sats }
    edge = await chromium.launch({ channel: 'msedge', headless: true })
    const alice = await join('Alice', 3_000)
    const bob = await join('Bob', 1_500)
    evidence.addresses = { alice: alice.address, bob: bob.address, funder: funderAddress }
    const parties = { alice: alice.address, bob: bob.address }
    const openTransfer = async (prepare: () => Promise<void>, topup: number) => {
      await preflight()
      const transfer = await ownTransfer(alice.page, prepare)
      transfers.push(transfer)
      expect(transfer).toMatchObject({ dust: '330', topup: String(topup), operatorKey: info.operatorKey })
      await expect(alice.page.getByTestId('taxi-confirm-costs')).toBeVisible()
      await alice.page.getByRole('button', { name: 'Pay', exact: true }).click()
      await dismissPaymentSuccess(alice.page)
      await expect.poll(async () => (await status(transfer.id)).state).toBe('locked')
      return transfer
    }
    const openHistory = async (actor: Actor, transferId: string) => {
      await navigateHome(actor.page)
      await actor.page.getByTestId('activity-view-all').click()
      const row = actor.page.getByTestId('tx-row').filter({ hasText: transferId.slice(0, 11) })
      const identified = (await row.count())
        ? row
        : actor.page.getByTestId('tx-row').filter({ hasText: /Taxi/ }).first()
      await identified.click()
      await expect(actor.page.getByTestId('Transfer ID')).toContainText(transferId.slice(0, 11))
    }
    const verifyRecycled = async (id: string) => {
      await expect.poll(async () => (await status(id)).state).toBe('recycled')
      const terminal = await status(id)
      const owned = transfers.find((transfer) => transfer.id === id)
      expect(owned).toBeDefined()
      await coinSpent(terminal, owned!)
      const admin = await adminGet<{ advances: { id: string; state: string; topup: string; receiverKey: string }[] }>(
        'advances',
      )
      const observed = admin?.advances.find((advance) => advance.id === id)
      if (admin) {
        expect(observed).toMatchObject({
          id,
          state: 'recycled',
          receiverKey: hex.encode(ArkAddress.decode(bob.address).vtxoTaprootKey),
        })
      }
      const states = evidence.states as unknown[] | undefined
      evidence.states = [
        ...(states ?? []),
        { id, state: terminal.state, outpoint: terminal.outpoint, spentTxid: terminal.spentTxid },
      ]
    }

    for (const amount of [329, 100]) {
      await test.step(`Exact ${amount}-sat delivery${amount === 100 ? ' using the receiver’s named Taxi' : ''}`, async () => {
        const before = await ledger(parties, '', ARKD)
        const request = amount === 100 ? await satsRequest(bob, amount) : bob.address
        if (amount === 100) {
          expect(request).toContain('taxipayer=receiver')
          expect(request).not.toContain('taxifare=')
          expect(request).not.toContain('taxikey=')
        }
        await openSatsSend(alice, request, amount, 'Receiver uses own sats')
        const transfer = await openTransfer(
          () => alice.page.getByRole('button', { name: tr.common.continue, exact: true }).click(),
          330 - amount,
        )
        await expect(bob.page.getByText(`${amount} sats arrived through your Taxi.`, { exact: true })).toBeVisible()
        await expect(bob.page.getByTestId('claim-fare')).toContainText(/Recycling repays Taxi/)
        await expect(bob.page.getByTestId('unclaimed-note')).toContainText(/return this to the sender/)
        await sheet(bob.page).getByRole('button', { name: 'Not now', exact: true }).click()
        await expect(bob.page.getByText('Claim your Taxi delivery', { exact: true })).not.toBeVisible()
        await openHistory(alice, transfer.id)
        await expect(alice.page.getByTestId('Delivery')).toHaveText('Awaiting claim')
        await expect(alice.page.getByTestId('Carrier mode')).toHaveText('Receiver uses own sats')
        await expect(alice.page.getByRole('button', { name: 'Check again', exact: true })).toBeVisible()
        await alice.page.getByRole('button', { name: 'Check again', exact: true }).click()
        if (amount === 329) {
          await bob.page.evaluate(() => window.dispatchEvent(new Event('focus')))
          await claim(bob, /merges with the delivery/)
        } else {
          await claimFromActivity(bob)
        }
        await verifyRecycled(transfer.id)
        await expect
          .poll(() => ledger(parties, '', ARKD))
          .toEqual({ alice: shift(before.alice, -BigInt(amount)), bob: shift(before.bob, BigInt(amount)) })
        await openHistory(alice, transfer.id)
        const check = alice.page.getByRole('button', { name: 'Check again', exact: true })
        if (await check.isVisible()) await check.click()
        await expect(alice.page.getByTestId('Delivery')).toHaveText('Claimed')
        await expect(await taxiRows(bob, 'Claimed')).toHaveCount(amount === 329 ? 1 : 2)
      })
    }

    await test.step('Unavailable, disabled and mismatched Taxi probes move no money', async () => {
      const before = await ledger(parties, '', ARKD)
      const count = requests.length
      for (const probe of ['paused', 'disabled', 'unreachable'] as const) {
        const route = `${TAXI}/v1/info`
        for (const actor of [alice, bob])
          await actor.page.route(route, (intercept) =>
            probe === 'unreachable'
              ? intercept.abort()
              : intercept.fulfill({
                  status: 200,
                  contentType: 'application/json',
                  body: JSON.stringify({
                    ...info,
                    paused: probe === 'paused',
                    assetRules: info.assetRules.map((rule) =>
                      rule.assetId === null && probe === 'disabled' ? { ...rule, enabled: false } : rule,
                    ),
                  }),
                }),
          )
        try {
          await openSatsSend(alice, bob.address, 100)
          await expect(alice.page.getByText(/^Taxi unavailable:/)).toBeVisible()
          await expect(alice.page.getByTestId('taxi-send-mode')).toHaveCount(0)
          await navigateHome(bob.page)
          await bob.page.getByText(tr.wallet.receive, { exact: true }).click()
          await enterReceiveAmount(bob.page, '100')
          await expect(bob.page.getByText(/^Taxi unavailable:/)).toBeVisible()
          await expect(bob.page.getByTestId('bip21')).not.toContainText('taxi=')
        } finally {
          for (const actor of [alice, bob]) await actor.page.unroute(route)
        }
      }
      const request = await satsRequest(bob, 100)
      const mismatch = `${request}&taxikey=${'11'.repeat(32)}`
      expect(decodeBip21(mismatch).taxi?.operatorKey).toBe('11'.repeat(32))
      await openSatsSend(alice, mismatch, 100)
      await expect(alice.page.getByText(/^Taxi unavailable:/)).toContainText(/operator/)
      await expect(alice.page.getByTestId('taxi-send-mode')).toHaveCount(0)
      expect(requests).toHaveLength(count)
      expect(await ledger(parties, '', ARKD)).toEqual(before)
      await openSatsSend(alice, bob.address, 330)
      await expect(alice.page.getByTestId('taxi-send-mode')).toHaveCount(0)
    })

    await test.step('Fresh asset recycle, live-policy refusals and plain-send fallback', async () => {
      expect(BigInt((await holdings(alice.address, '', ARKD)).sats)).toBeGreaterThanOrEqual(660n)
      const beforeMint = await ownedAssets(alice.address)
      expect(beforeMint).toEqual({})
      let mintError: unknown
      let uiAssetId = ''
      try {
        uiAssetId = await mintXyz(alice)
      } catch (error) {
        mintError = error
      } finally {
        try {
          assetId = await resolveRunMint(alice, beforeMint)
          evidence.assetId = assetId
          if (uiAssetId) expect(assetId).toBe(uiAssetId)
        } catch (error) {
          throw new Error(
            `${mintError ? `${safeMessage(mintError, secrets)}; ` : ''}Mint recovery failed: ${safeMessage(error, secrets)}`,
          )
        }
      }
      if (mintError) throw mintError
      await importAsset(bob, assetId)
      const assetFare = info.assetRules
        .find((rule) => rule.assetId === '*')!
        .fares.find(
          (fare) => fare.currency === 'sats' && fare.pricing.kind === 'flat' && fare.pricing.units === '0',
        )!.id
      const request = await receiveRequest(bob, assetId, assetFare)
      const before = await ledger(parties, assetId, ARKD)
      const count = requests.length
      await prepareSend(alice, request, 'Sender pays asset fare')
      await expect(alice.page.getByTestId('error-message')).toHaveText('Taxi does not support purchase claims')
      await prepareSend(alice, request, 'Sender sponsors carrier')
      await expect(alice.page.getByTestId('error-message')).toHaveText('Taxi offers no asset fare')
      expect(requests).toHaveLength(count)
      expect(await ledger(parties, assetId, ARKD)).toEqual(before)
      const transfer = await openTransfer(() => prepareSend(alice, request, 'Receiver uses own sats'), 330)
      await claim(bob, /merges with the delivery/)
      await verifyRecycled(transfer.id)
      await expect
        .poll(() => ledger(parties, assetId, ARKD))
        .toEqual({ alice: shift(before.alice, 0n, -1n), bob: shift(before.bob, 0n, 1n) })
      const settled = await ledger(parties, assetId, ARKD)
      const at = requests.length
      await prepareSend(alice, request)
      await alice.page.getByRole('button', { name: tr.send.tapToSign, exact: true }).click()
      await dismissPaymentSuccess(alice.page)
      await expect
        .poll(() => ledger(parties, assetId, ARKD))
        .toEqual({ alice: shift(settled.alice, -330n, -1n), bob: shift(settled.bob, 330n, 1n) })
      expect(requests).toHaveLength(at)
      await navigateHome(alice.page)
      await alice.page.getByTestId('activity-view-all').click()
      await expect(alice.page.getByTestId('tx-row').first()).not.toContainText('Taxi')

      const carol = await join('Carol', 500)
      const carolBefore = await holdings(carol.address, assetId, ARKD)
      const prior = requests.length
      await prepareSend(carol, request)
      await expect(carol.page.getByTestId('error-message')).toBeVisible()
      expect(await holdings(carol.address, assetId, ARKD)).toEqual(carolBefore)
      expect(requests).toHaveLength(prior)
    })
    evidence.balances = await ledger(
      Object.fromEntries(actors.map((actor) => [actor.name, actor.address])),
      assetId,
      ARKD,
    )
    await preflight()
  } catch (error) {
    evidence.failure = safeMessage(error, secrets)
    throw new Error(safeMessage(error, secrets))
  } finally {
    testInfo.setTimeout(testInfo.timeout + 180_000)
    for (const context of contexts) await context.unrouteAll({ behavior: 'ignoreErrors' })
    const bob = actors.find((actor) => actor.name === 'Bob')
    for (const transfer of transfers) {
      try {
        if ((await status(transfer.id)).state === 'locked' && bob) {
          await bob.page.evaluate(() => window.dispatchEvent(new Event('focus')))
          await claim(bob, /merges with the delivery/)
          await expect.poll(async () => (await status(transfer.id)).state).toBe('recycled')
        }
        const remaining = await status(transfer.id)
        if (!['recycled', 'refunded', 'recovered', 'expired'].includes(remaining.state))
          cleanupErrors.push(`Transfer ${transfer.id} remains ${remaining.state}`)
      } catch (error) {
        cleanupErrors.push(`Transfer ${transfer.id}: ${safeMessage(error, secrets)}`)
      }
    }
    for (const actor of actors) {
      try {
        const assets = await ownedAssets(actor.address)
        if (Object.keys(assets).some((id) => id !== assetId)) {
          cleanupErrors.push(`${actor.name} has unexpected assets; refusing to sweep ${JSON.stringify(assets)}`)
          continue
        }
      } catch (error) {
        cleanupErrors.push(`${actor.name} cleanup asset check: ${safeMessage(error, secrets)}`)
        continue
      }
      try {
        await sweep(actor, funderAddress, assetId)
      } catch (error) {
        const recovery = recoveryWallets.get(actor.address)
        try {
          if (!recovery) throw new Error('Fresh actor recovery wallet was not initialized')
          await sweepSdk(actor, recovery, funderAddress, assetId)
          const recovered = evidence.sdkSweeps as string[] | undefined
          evidence.sdkSweeps = [...(recovered ?? []), actor.name]
        } catch (fallbackError) {
          cleanupErrors.push(
            `${actor.name} UI sweep: ${safeMessage(error, secrets)}; SDK sweep: ${safeMessage(fallbackError, secrets)}`,
          )
        }
      }
    }
    try {
      evidence.remaining = await ledger(
        Object.fromEntries(actors.map((actor) => [actor.name, actor.address])),
        assetId,
        ARKD,
      )
      evidence.remainingAssets = Object.fromEntries(
        await Promise.all(actors.map(async (actor) => [actor.name, await ownedAssets(actor.address)])),
      )
      evidence.cleanupErrors = cleanupErrors
      const remaining = evidence.remaining as Record<string, { sats: string; units: string }>
      for (const [name, balance] of Object.entries(remaining))
        if (balance.sats !== '0' || balance.units !== '0')
          cleanupErrors.push(`${name} has ${balance.sats} spendable sats and ${balance.units} units after both sweeps`)
      evidence.funderAfter = { address: funderAddress, sats: (await holdings(funderAddress, '', ARKD)).sats }
      assertNoSecrets(evidence, secrets)
      const directory = resolve('test-results/taxi-mutinynet')
      mkdirSync(directory, { recursive: true })
      const path = resolve(directory, 'evidence.json')
      writeFileSync(path, `${JSON.stringify(evidence, null, 2)}\n`)
      await testInfo.attach('Live Taxi evidence', { path, contentType: 'application/json' })
    } finally {
      for (const context of contexts) await context.close()
      await edge?.close()
      for (const recovery of recoveryWallets.values()) await recovery.dispose()
      await funder.dispose()
    }
    if (cleanupErrors.length) throw new Error(`Live cleanup: ${cleanupErrors.join('; ')}`)
  }
})
