import { expect, test, type Page } from '@playwright/test'
import { ArkAddress, MnemonicIdentity, RestIndexerProvider, Transaction, asset } from '@arkade-os/sdk'
import { TaxiClient, verifyQuote } from '@arkade-taxi/client'
import { fundingInputFromWire } from '@arkade-taxi/protocol'
import { base64, hex } from '@scure/base'
import type { PendingTaxiRecord } from '../../lib/directTaxiSend'
import {
  admin,
  advances,
  claim,
  control,
  expectLedger,
  importAsset,
  ledger,
  mintXyz,
  newAdvance,
  newAdvances,
  openTaxiRow,
  operatorAddress,
  policyRulesForPatch,
  prepareSend,
  receiveRequest,
  required,
  shift,
  stage,
  taxiConfirmation,
  taxiStatus,
  xyzRule,
  type Actor,
  type TaxiPolicy,
} from './actors'

process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1'

const PENDING = 'Payment may have been submitted; retry checks the same transfer'
const recordFor = (page: Page, id: string) =>
  page.evaluate((transferId) => {
    const key = Object.keys(localStorage).find((item) => item.startsWith('directTaxiPending:'))
    const record = key ? JSON.parse(localStorage.getItem(key)!) : undefined
    if (record?.transferId !== transferId) throw new Error('The signed Taxi attempt is unavailable')
    return record as PendingTaxiRecord
  }, id)

const journaled = (page: Page) =>
  page.evaluate(() => Object.keys(localStorage).some((key) => key.startsWith('directTaxiPending:')))

async function pendingSend(alice: Actor, bob: Actor, assetId: string) {
  const before = await advances()
  await prepareSend(alice, await receiveRequest(bob, assetId), 'Receiver uses own sats')
  await taxiConfirmation(alice)
  const { id } = await newAdvance(before)
  const statusRoute = `**/v1/transfers/${id}`
  await alice.page.route(statusRoute, (route) => route.abort())
  await control('configure', {
    target: 'taxi',
    path: `/v1/transfers/${id}/lockup`,
    method: 'POST',
    mode: 'drop',
    once: false,
  })
  await alice.page.getByRole('button', { name: 'Pay', exact: true }).click()
  await expect(alice.page.getByText(PENDING, { exact: true })).toBeVisible()
  await expect.poll(async () => (await taxiStatus(id)).state).toBe('locked')
  await control('reset')
  const record = await recordFor(alice.page, id)
  const indexer = new RestIndexerProvider(required('TAXI_E2E_ARKD_URL'))
  const [funding] = (await indexer.getVtxos({ outpoints: [{ txid: record.expectedTxid, vout: record.expectedVout }] }))
    .vtxos
  expect(funding).toBeDefined()
  expect(funding.isSpent).toBe(false)
  return {
    id,
    before,
    statusRoute,
    record,
    funding: {
      txid: record.expectedTxid,
      vout: record.expectedVout,
      script: funding.script,
      sats: String(funding.value),
      assetUnits: String(funding.assets?.find((holding) => holding.assetId === assetId)?.amount),
      spent: funding.isSpent,
    },
  }
}

async function refundAttempt(alice: Actor, record: PendingTaxiRecord) {
  const attempt = record.attempt
  if (attempt?.kind !== 'covenant' || !record.assetId) throw new Error('Expected a signed asset covenant')
  // Read the fresh test wallet through its own decryptor without exposing its phrase in the DOM or evidence.
  let identity: MnemonicIdentity
  try {
    const mnemonic = await alice.page.evaluate(async () => {
      try {
        const mnemonicModule = '/src/lib/mnemonic.ts'
        const constantsModule = '/src/lib/constants.ts'
        const { getMnemonic } = await import(mnemonicModule)
        const { defaultPassword } = await import(constantsModule)
        return getMnemonic(defaultPassword)
      } catch {
        throw new Error('Cannot read the fresh test wallet identity')
      }
    })
    identity = MnemonicIdentity.fromMnemonic(mnemonic, { isMainnet: false })
  } catch {
    throw new Error('Cannot read the fresh test wallet identity')
  }
  expect(hex.encode(await identity.xOnlyPublicKey())).toBe(record.senderKey)
  const client = new TaxiClient({ baseUrl: record.taxiUrl })
  const info = await client.info()
  const senderInputs = attempt.senderInputs.map((input) => fundingInputFromWire(input))
  const receiver = ArkAddress.decode(record.receiverAddress)
  const sdkId = asset.AssetId.fromString(record.assetId)
  const assetId = { txid: Uint8Array.from(sdkId.txid).reverse(), groupIndex: sdkId.groupIndex }
  const verified = verifyQuote({
    info,
    quote: attempt.quote,
    trustedServerKey: hex.decode(attempt.serverKey),
    trustedEmulatorKey: hex.decode(attempt.emulatorKey),
    trustedServerUnrollScript: hex.decode(attempt.serverUnrollScript),
    vtxoMinAmount: BigInt(attempt.vtxoMinAmount),
    hrp: attempt.hrp,
    senderInputs,
    senderSats: senderInputs.reduce((sum, input) => sum + input.value, 0n),
    assetUnits: BigInt(record.assetAmount),
    expect: {
      receiverKey: receiver.vtxoTaprootKey,
      senderKey: hex.decode(record.senderKey),
      assetId,
      maxFare: { currency: 'sats', units: BigInt(attempt.maxFare.units) },
      maxTopupSats: BigInt(attempt.carrierCeiling),
      minLocktime: BigInt(attempt.minLocktime),
      claimMode: 'recycle',
      recoveryRecipient: 'sender',
    },
  })
  const lockup = await client.submitLockup(verified, attempt.signed)
  expect(lockup.outpoint).toEqual({ txid: record.expectedTxid, vout: record.expectedVout })
  const transfer = await client.verifyTransfer(verified, lockup, {
    arkdUrl: required('TAXI_E2E_ARKD_URL'),
    emulatorUrl: required('TAXI_E2E_EMULATOR_URL'),
    network: record.network,
    serverUnrollScript: attempt.serverUnrollScript,
  })
  return { txid: await client.refund(transfer, identity), params: verified.params, operatorKey: info.operatorKey }
}

test(
  'P4/H6: an injected failure observation stops polling; the real transfer still claims once',
  { tag: '@failure' },
  async ({ browser }, testInfo) => {
    await stage(browser, testInfo, async ({ join, evidence }) => {
      const alice = await join('Alice', { sats: 5_000 })
      const bob = await join('Bob', { sats: 1_000 })
      const assetId = await mintXyz(alice)
      const policy = await admin<TaxiPolicy>('policy')
      await admin('policy', 'PATCH', { assetRules: [...policyRulesForPatch(policy.assetRules), xyzRule(assetId)] })
      await importAsset(bob, assetId)
      const parties = { alice: alice.address, bob: bob.address, taxi: operatorAddress() }
      const before = await ledger(parties, assetId)
      const pending = await pendingSend(alice, bob, assetId)
      const actual = await taxiStatus(pending.id)
      evidence.failureObservation = { injected: true, backendBefore: actual, funding: pending.funding }
      let reads = 0
      await alice.page.unroute(pending.statusRoute)
      await alice.page.route(pending.statusRoute, (route) => {
        reads += 1
        return route.fulfill({
          json: {
            transferId: pending.id,
            state: 'locking',
            submissionPhase: 'failed',
            failureCode: 'lockup_submission_invalid_provider_response',
            failureDetail: 'server checkpoint 0 changed unsigned fields or metadata',
            updatedAt: actual.updatedAt,
          },
        })
      })
      try {
        await test.step('P4: checking the same transfer reports a definite failure and stops the send poll', async () => {
          await alice.page.getByRole('button', { name: 'Check Taxi payment', exact: true }).click()
          await expect(alice.page.getByTestId('error-message')).toContainText('Taxi could not submit this payment', {
            timeout: 10_000,
          })
          await expect(alice.page.getByTestId('error-message')).toContainText(
            'server checkpoint 0 changed unsigned fields or metadata',
          )
          await expect(alice.page.getByText(PENDING, { exact: true })).not.toBeVisible()
          await expect(alice.page.getByRole('button', { name: 'Forget Taxi payment', exact: true })).toBeVisible()
          expect(reads).toBeGreaterThan(0)
          const stopped = reads
          await alice.page.waitForTimeout(1_500)
          expect(reads - stopped).toBeLessThanOrEqual(1)
          expect(await journaled(alice.page)).toBe(true)
          expect(await newAdvances(pending.before)).toHaveLength(1)
        })
        await test.step('H6: Failed history retains its information and same-transfer check action', async () => {
          await openTaxiRow(alice, 'Failed')
          await expect(alice.page.getByTestId('Delivery')).toHaveText('Failed')
          await expect(alice.page.getByTestId('Transfer ID')).toContainText(pending.id.slice(0, 11))
          await expect(alice.page.getByRole('button', { name: 'Check again', exact: true })).toBeVisible()
          expect((await taxiStatus(pending.id)).state).toBe('locked')
          await alice.page.unroute(pending.statusRoute)
          await alice.page.getByRole('button', { name: 'Check again', exact: true }).click()
          await expect(alice.page.getByTestId('Delivery')).toHaveText('Awaiting claim')
          await expect.poll(() => journaled(alice.page)).toBe(false)
          await claim(bob, /merges with the delivery/)
          await expect.poll(async () => (await taxiStatus(pending.id)).state).toBe('recycled')
          expect(await newAdvances(pending.before)).toHaveLength(1)
          await expectLedger(parties, assetId, {
            alice: shift(before.alice, 0n, -1n),
            bob: shift(before.bob, 0n, 1n),
            taxi: before.taxi,
          })
          evidence.backendAfter = await taxiStatus(pending.id)
        })
      } finally {
        await alice.page.unroute(pending.statusRoute)
        await control('reset')
      }
    })
  },
)

test(
  'P5/H7: an actual sender refund returns an unconfirmed delivery as a swept asset receipt',
  { tag: '@refund' },
  async ({ browser }, testInfo) => {
    await stage(browser, testInfo, async ({ join, evidence }) => {
      const alice = await join('Alice', { sats: 5_000 })
      const bob = await join('Bob', { sats: 1_000 })
      const assetId = await mintXyz(alice)
      const policy = await admin<TaxiPolicy>('policy')
      await admin('policy', 'PATCH', { assetRules: [...policyRulesForPatch(policy.assetRules), xyzRule(assetId)] })
      await importAsset(bob, assetId)
      const parties = { alice: alice.address, bob: bob.address, taxi: operatorAddress() }
      const before = await ledger(parties, assetId)
      const pending = await pendingSend(alice, bob, assetId)
      try {
        const refunded = await refundAttempt(alice, pending.record)
        await expect.poll(async () => (await taxiStatus(pending.id)).state).toBe('refunded')
        expect((await taxiStatus(pending.id)).spentTxid).toBe(refunded.txid)
        const indexer = new RestIndexerProvider(required('TAXI_E2E_ARKD_URL'))
        const returned =
          refunded.params.dust -
          (refunded.params.topup < refunded.params.dust - BigInt(pending.record.attempt!.vtxoMinAmount)
            ? refunded.params.topup
            : refunded.params.dust - BigInt(pending.record.attempt!.vtxoMinAmount))
        const receipt = async () => (await indexer.getVtxos({ outpoints: [{ txid: refunded.txid, vout: 1 }] })).vtxos
        await expect.poll(async () => (await receipt()).length).toBe(1)
        const [coin] = await receipt()
        const transactions = (await indexer.getVirtualTxs([refunded.txid])).txs
        expect(transactions).toHaveLength(1)
        const refundTx = Transaction.fromPSBT(base64.decode(transactions[0]))
        expect(refundTx.id).toBe(refunded.txid)
        expect(hex.encode(refundTx.getOutput(1).script!)).toBe(`6a20${pending.record.senderKey}`)
        expect(refundTx.getOutput(1).amount).toBe(returned)
        expect(coin.script).toBe(`5120${pending.record.senderKey}`)
        expect(coin.script).not.toBe(hex.encode(ArkAddress.decode(alice.address).pkScript))
        expect(coin.isSwept).toBe(true)
        expect(BigInt(coin.value)).toBe(returned)
        expect(coin.assets?.find((holding) => holding.assetId === assetId)?.amount).toBe(1n)
        const contribution = refunded.params.dust - refunded.params.topup
        await expectLedger(parties, assetId, {
          alice: shift(before.alice, -contribution, -1n),
          bob: before.bob,
          taxi: shift(before.taxi, -(returned - contribution)),
        })
        await expect
          .poll(
            async () => {
              const [payout] = (await indexer.getVtxos({ outpoints: [{ txid: refunded.txid, vout: 0 }] })).vtxos
              const status = await admin<{ readiness: { proceeds: { state: string; blocker: string | null } } }>(
                'status',
              )
              return Boolean(
                payout?.script === `5120${refunded.operatorKey}` &&
                  payout.isSpent &&
                  /^[a-f0-9]{64}$/.test(payout.settledBy ?? '') &&
                  status.readiness.proceeds.state === 'idle' &&
                  status.readiness.proceeds.blocker === null,
              )
            },
            { timeout: 120_000 },
          )
          .toBe(true)
        const after = await ledger(parties, assetId)
        const sum = (values: typeof before, field: 'sats' | 'units') =>
          Object.values(values).reduce((total, holding) => total + BigInt(holding[field]), 0n)
        expect(sum(after, 'sats') + BigInt(coin.value)).toBe(sum(before, 'sats'))
        expect(sum(after, 'units') + 1n).toBe(sum(before, 'units'))
        await test.step('P5: retry reads the real refund without submitting another payment', async () => {
          await alice.page.unroute(pending.statusRoute)
          await alice.page.getByRole('button', { name: 'Check Taxi payment', exact: true }).click()
          await expect(alice.page.getByTestId('error-message')).toHaveText(
            'Taxi returned this payment to you; no new payment was sent.',
          )
          await expect(alice.page.locator('input[name="send-address"]')).toHaveValue(pending.record.receiverAddress)
          expect(await journaled(alice.page)).toBe(false)
          expect(await newAdvances(pending.before)).toHaveLength(1)
        })
        await test.step('H7: returned history links the real refund and offers no duplicate payment', async () => {
          await openTaxiRow(alice, 'Returned')
          await expect(alice.page.getByTestId('Delivery')).toHaveText('Returned')
          await expect(alice.page.getByTestId('Transfer ID')).toContainText(pending.id.slice(0, 11))
          const related = alice.page
            .locator('[data-testid^="Related transaction"]')
            .filter({ hasText: refunded.txid.slice(0, 8) })
          await expect(related).toContainText(refunded.txid.slice(0, 8))
          await related.click()
          await expect.poll(() => alice.page.evaluate(() => navigator.clipboard.readText())).toBe(refunded.txid)
          await expect(alice.page.getByRole('button', { name: 'Check again', exact: true })).not.toBeVisible()
          await expect(alice.page.getByRole('button', { name: 'Claim', exact: true })).not.toBeVisible()
          evidence.refund = {
            transferId: pending.id,
            txid: refunded.txid,
            funding: pending.funding,
            receipt: { script: coin.script, sats: String(coin.value), assetUnits: '1', swept: coin.isSwept },
            before,
            after,
          }
        })
      } finally {
        await alice.page.unroute(pending.statusRoute)
        await control('reset')
      }
    })
  },
)
