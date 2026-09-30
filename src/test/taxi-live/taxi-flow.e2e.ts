import { expect, test } from '@playwright/test'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ArkAddress } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { mintAsset, navigateToAssets, enableAssets, navigateHome, dismissPaymentSuccess } from '../e2e/utils'
import {
  admin,
  claim,
  confirmSend,
  control,
  faucetWallet,
  fund,
  holdings,
  importAsset,
  onboard,
  policyRulesForPatch,
  prepareSend,
  receiveRequest,
  required,
  taxiConfirmation,
  tr,
  xyzRule,
  type Holdings,
  type TaxiPolicy,
} from './actors'

type ProxyEvents = {
  events: { at: number; target: string; path: string; method?: string; action: string }[]
}

test('Alice sends XYZ to Bob through Taxi, choosing who supplies the carrier', async ({ browser }, testInfo) => {
  const contextOptions = {
    baseURL: testInfo.project.use.baseURL,
    permissions: ['clipboard-read', 'clipboard-write'],
    locale: 'en-US',
    reducedMotion: 'reduce' as const,
  }
  const aliceContext = await browser.newContext(contextOptions)
  const bobContext = await browser.newContext(contextOptions)
  const faucet = await faucetWallet()
  const originalPolicy = await admin<TaxiPolicy>('policy')
  const originalRules = policyRulesForPatch(originalPolicy.assetRules)
  const fixture = JSON.parse(readFileSync(required('TAXI_E2E_FIXTURE_FILE'), 'utf8')) as {
    operator: { address: string }
  }
  const evidence: { step: string; alice: Holdings; bob: Holdings; taxi: Holdings }[] = []
  const reconciledTransfers: string[] = []
  let scenarioFailed = false
  let assetId = ''
  try {
    const alice = await onboard('Alice', await aliceContext.newPage())
    const bob = await onboard('Bob', await bobContext.newPage())
    const snapshot = async (step: string) => {
      const [aliceBalance, bobBalance, taxiBalance] = await Promise.all([
        holdings(alice.address, assetId),
        holdings(bob.address, assetId),
        holdings(fixture.operator.address, assetId),
      ])
      const state = { step, alice: aliceBalance, bob: bobBalance, taxi: taxiBalance }
      evidence.push(state)
      return state
    }
    const expectBalances = async (expected: Omit<(typeof evidence)[number], 'step'>) => {
      await expect(async () => {
        const state = await snapshot('observed')
        expect({ alice: state.alice, bob: state.bob, taxi: state.taxi }).toEqual(expected)
      }).toPass({ timeout: 90_000, intervals: [250, 500, 1000] })
    }

    await test.step('Alice creates 20 XYZ; Bob has neither XYZ nor sats', async () => {
      await fund(faucet, alice, 20_000)
      await enableAssets(alice.page)
      await mintAsset(alice.page, { amount: '20', name: 'Taxi Regtest XYZ', ticker: 'XYZ', decimals: 0 })
      const rowId = await alice.page.getByTestId(/^asset-row-XYZ-/).getAttribute('data-testid')
      assetId = rowId!.slice('asset-row-XYZ-'.length)
      await admin('policy', 'PATCH', { assetRules: [...originalRules, xyzRule(assetId)] })
      await importAsset(bob, assetId)
      expect(await holdings(bob.address, assetId)).toEqual({ sats: '0', units: '0' })
      await expect.poll(async () => (await holdings(alice.address, assetId)).units).toBe('20')
    })

    let request = await receiveRequest(bob, assetId)
    await test.step('Canceling the fare confirmation spends neither party’s money', async () => {
      const before = await snapshot('before canceled purchase')
      await admin('policy', 'PATCH', { quoteTtlSeconds: 20 })
      await prepareSend(alice, request, 'Sender pays asset fare')
      await taxiConfirmation(alice)
      await alice.page.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expectBalances({ alice: before.alice, bob: before.bob, taxi: before.taxi })
      await navigateHome(alice.page)
      await expect
        .poll(async () => {
          const { advances } = await admin<{ advances: { state: string }[] }>('advances')
          return advances.some((advance) => advance.state === 'quoted')
        })
        .toBe(false)
      await admin('policy', 'PATCH', { quoteTtlSeconds: originalPolicy.quoteTtlSeconds })
    })

    await test.step('Bob has no sats: Alice’s purchased carrier survives a dropped response and browser reload', async () => {
      const before = await snapshot('before purchase')
      const { advances: beforeQuotes } = await admin<{ advances: { id: string }[] }>('advances')
      await prepareSend(alice, request, 'Sender pays asset fare')
      await taxiConfirmation(alice)
      await expect(alice.page.getByTestId('taxi-confirm-costs')).toContainText(/fare/i)
      const { advances } = await admin<{
        advances: {
          id: string
          state: string
          receiverKey: string
          assetId?: { txid: string; groupIndex: number }
        }[]
      }>('advances')
      const receiverKey = hex.encode(ArkAddress.decode(bob.address).vtxoTaprootKey)
      const wireAsset = xyzRule(assetId).assetId
      const quotes = advances.filter(
        (advance) =>
          !beforeQuotes.some((previous) => previous.id === advance.id) &&
          advance.state === 'quoted' &&
          advance.receiverKey === receiverKey &&
          advance.assetId?.txid === wireAsset.txid &&
          advance.assetId.groupIndex === wireAsset.groupIndex,
      )
      expect(quotes).toHaveLength(1)
      const transferId = quotes[0].id
      await control('configure', {
        target: 'taxi',
        path: `/v1/transfers/${transferId}/lockup`,
        method: 'POST',
        mode: 'drop',
        once: false,
      })
      await alice.page.getByRole('button', { name: 'Pay', exact: true }).click()
      await expect(
        alice.page.getByText('Payment may have been submitted; retry checks the same transfer', { exact: true }),
      ).toBeVisible()
      await control('reset')
      await alice.page.reload()
      await expect(alice.page.getByTestId('home-action-receive')).toBeVisible()
      await alice.page.getByText(tr.wallet.send, { exact: true }).click()
      await alice.page.getByRole('button', { name: 'Check Taxi payment', exact: true }).click()
      await dismissPaymentSuccess(alice.page)
      const { advances: reconciled } = await admin<{ advances: { id: string }[] }>('advances')
      expect(reconciled.map((advance) => advance.id).sort()).toEqual(advances.map((advance) => advance.id).sort())
      reconciledTransfers.push(transferId)
      await claim(bob, /330|purchase|carrier/i)
      await expectBalances({
        alice: { sats: before.alice.sats, units: (BigInt(before.alice.units) - 2n).toString() },
        bob: { sats: '330', units: '1' },
        taxi: { sats: (BigInt(before.taxi.sats) - 330n).toString(), units: '1' },
      })
    })

    await test.step('Bob uses his own sats coin and Taxi receives its carrier back', async () => {
      await fund(faucet, bob, 1000)
      request = await receiveRequest(bob, assetId)
      const before = await snapshot('before recycle')
      await prepareSend(alice, request, 'Receiver uses own sats')
      await taxiConfirmation(alice)
      const armedAt = Date.now()
      const newEvents = async () => (await control<ProxyEvents>('events')).events.filter((event) => event.at >= armedAt)
      await control('configure', {
        target: 'emulator',
        path: '/v1/info',
        method: 'GET',
        mode: 'pause',
        phase: 'request',
      })
      try {
        await expect
          .poll(
            async () =>
              (await newEvents()).some(
                (event) =>
                  event.target === 'emulator' && event.path === '/v1/info' && event.action === 'request-paused',
              ),
            { timeout: 10_000, intervals: [25, 50, 100] },
          )
          .toBe(true)
        let runtimeBlockers: string[] = []
        let readyStatus = 0
        await expect
          .poll(
            async () => {
              const readiness = await fetch(`${required('TAXI_E2E_BASE_URL')}/ready`)
              readyStatus = readiness.status
              const state = (await readiness.json()) as { runtime: { blockers: string[] } }
              runtimeBlockers = state.runtime.blockers
              return runtimeBlockers
            },
            { timeout: 10_000, intervals: [25, 50, 100] },
          )
          .toContain('runtime_checking')
        expect(readyStatus).toBe(503)
        const lockupResponse = alice.page.waitForResponse(
          (response) =>
            response.request().method() === 'POST' &&
            /\/v1\/transfers\/[^/]+\/lockup$/.test(new URL(response.url()).pathname),
          { timeout: 15_000 },
        )
        await alice.page.getByRole('button', { name: 'Pay', exact: true }).click()
        let lockupPath = ''
        await expect
          .poll(
            async () => {
              lockupPath =
                (await newEvents()).find(
                  (event) =>
                    event.target === 'taxi' &&
                    event.action === 'forwarded' &&
                    event.method === 'POST' &&
                    /^\/v1\/transfers\/[^/]+\/lockup$/.test(event.path),
                )?.path ?? ''
              return lockupPath
            },
            { timeout: 10_000, intervals: [25, 50, 100] },
          )
          .not.toBe('')
        await new Promise((resolve) => setTimeout(resolve, 300))
        await control('reset')
        const response = await lockupResponse
        expect(new URL(response.url()).pathname.endsWith(lockupPath)).toBe(true)
        expect(
          [200, 202],
          `Taxi POST ${lockupPath}: HTTP ${response.status()}; ${runtimeBlockers.join(', ')}`,
        ).toContain(response.status())
        await dismissPaymentSuccess(alice.page)
      } finally {
        await control('reset')
      }
      await claim(bob, /comes back|merges|repaid/i)
      await expectBalances({
        alice: { sats: before.alice.sats, units: (BigInt(before.alice.units) - 1n).toString() },
        bob: { sats: before.bob.sats, units: '2' },
        taxi: before.taxi,
      })
    })

    await test.step('Alice sponsors the carrier with XYZ; Bob receives it directly', async () => {
      request = await receiveRequest(bob, assetId)
      const before = await snapshot('before sponsored send')
      await prepareSend(alice, request, 'Sender sponsors carrier')
      await confirmSend(alice, true)
      await expectBalances({
        alice: { sats: before.alice.sats, units: (BigInt(before.alice.units) - 2n).toString() },
        bob: { sats: (BigInt(before.bob.sats) + 330n).toString(), units: '3' },
        taxi: { sats: (BigInt(before.taxi.sats) - 330n).toString(), units: '2' },
      })
      await expect(bob.page.getByText('Claim your Taxi delivery', { exact: true })).not.toBeVisible()
    })

    await test.step('Alice supplies her own sats and Taxi is uninvolved', async () => {
      const before = await snapshot('before normal send')
      await prepareSend(alice, request)
      await confirmSend(alice, false)
      await expectBalances({
        alice: {
          sats: (BigInt(before.alice.sats) - 330n).toString(),
          units: (BigInt(before.alice.units) - 1n).toString(),
        },
        bob: { sats: (BigInt(before.bob.sats) + 330n).toString(), units: '4' },
        taxi: before.taxi,
      })
    })

    await test.step('A paused Taxi refuses the send without debiting either wallet', async () => {
      const before = await snapshot('before paused refusal')
      await admin('pause', 'POST')
      try {
        await prepareSend(alice, request, 'Sender pays asset fare')
        await expect(alice.page.getByText('Taxi is paused', { exact: false })).toBeVisible()
        await expectBalances({ alice: before.alice, bob: before.bob, taxi: before.taxi })
      } finally {
        await admin('resume', 'POST')
      }
    })

    await test.step('Alice cannot spend her entire XYZ balance while also owing Taxi a fare', async () => {
      const before = await snapshot('before insufficient fare refusal')
      await prepareSend(alice, request, 'Sender pays asset fare', before.alice.units)
      await expect(alice.page.getByText(/Insufficient asset balance/)).toBeVisible()
      await expectBalances({ alice: before.alice, bob: before.bob, taxi: before.taxi })
    })

    await navigateToAssets(bob.page)
    await expect(bob.page.getByTestId(`asset-row-XYZ-${assetId}`)).toContainText('4 XYZ')
  } catch (error) {
    scenarioFailed = true
    throw error
  } finally {
    const cleanupErrors: string[] = []
    for (const cleanup of [
      () => control('reset'),
      () =>
        admin('policy', 'PATCH', {
          assetRules: originalRules,
          quoteTtlSeconds: originalPolicy.quoteTtlSeconds,
        }),
      () => faucet.dispose(),
      () => aliceContext.close(),
      () => bobContext.close(),
    ]) {
      try {
        await cleanup()
      } catch (error) {
        cleanupErrors.push(error instanceof Error ? error.message : 'Cleanup failed')
      }
    }
    try {
      const directory = resolve(process.env.TAXI_E2E_WALLET_ARTIFACTS || 'test-results/taxi-live')
      mkdirSync(directory, { recursive: true })
      const path = resolve(directory, 'alice-bob-balances.json')
      writeFileSync(path, `${JSON.stringify({ assetId, reconciledTransfers, evidence, cleanupErrors }, null, 2)}\n`)
      await testInfo.attach('Alice, Bob and Taxi balances', { path, contentType: 'application/json' })
    } catch (error) {
      cleanupErrors.push(error instanceof Error ? error.message : 'Evidence write failed')
    }
    if (cleanupErrors.length && !scenarioFailed) throw new Error(`Regtest cleanup: ${cleanupErrors.join('; ')}`)
  }
})
