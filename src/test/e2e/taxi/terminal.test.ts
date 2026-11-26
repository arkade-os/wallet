import { expect, test } from '@playwright/test'
import { RestIndexerProvider } from '@arkade-os/sdk'
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { parseEnv, promisify } from 'node:util'
import {
  actor,
  admin,
  advances,
  fresh,
  ledger,
  pay,
  restorePolicy,
  rule,
  send,
  shift,
  status,
  taxiUrl,
  tr,
  type Policy,
} from './helpers'
import { dismissPaymentSuccess, navigateHome, prePay } from '../utils'
import { durableHolds, journal, type Outpoint } from './reservationEvidence'

test('A finalized competing reclaim releases only the provably unspent held receiver input', async ({
  browser,
}, info) => {
  const infrastructureFile = process.env.TAXI_REGTEST_ENV_FILE!
  const infrastructure = parseEnv(await readFile(infrastructureFile, 'utf8'))
  const namespace = infrastructure.REGTEST_PROJECT
  if (!namespace) throw new Error('Native namespace is required')
  expect(namespace).toMatch(/^taxi-native-[0-9a-f]{8}$/)
  expect(infrastructure.REGTEST_CONTAINER_PREFIX).toBe(`${namespace}-`)
  expect(dirname(infrastructureFile)).toBe(resolve('.local-tests', namespace))
  expect(taxiUrl).toBe(`http://127.0.0.1:${infrastructure.TAXI_HTTP_PORT}`)
  expect(process.env.TAXI_REGTEST_ARKD_URL).toBe(`http://127.0.0.1:${infrastructure.ARKD_PORT}`)
  const runner = resolve(dirname(infrastructureFile), 'regtest/regtest.mjs')
  const invoke = (...args: string[]) =>
    promisify(execFile)(process.execPath, [runner, ...args, '--env', infrastructureFile], {
      timeout: 60_000,
      env: { ...process.env, ...infrastructure },
    })
  const contexts = await Promise.all(
    [0, 1, 2].map(() =>
      browser.newContext({
        ...info.project.use,
        ...info.project.use.contextOptions,
        baseURL: info.project.use.baseURL,
      }),
    ),
  )
  const policy = await admin<Policy>('policy')
  try {
    await admin('policy', 'PATCH', { assetRules: [rule(null)] })
    const alice = await actor(await contexts[0].newPage(), 5000)
    const bob = await actor(await contexts[1].newPage(), 1000)
    const charlie = await actor(await contexts[2].newPage(), 0)
    const known = await advances()
    await send(alice, bob.address, '100', 'Receiver uses own sats')
    await pay(alice)
    const [transfer] = await fresh(known)
    const parties = { alice: alice.address, bob: bob.address, charlie: charlie.address }
    const before = await ledger(parties)
    const { emulatorUrl } = await (await fetch(`${taxiUrl}/v1/info`)).json()
    let submissions = 0
    await contexts[1].route(new URL('/v1/tx', emulatorUrl).href, async (route) => {
      if (route.request().method() !== 'POST') return route.continue()
      submissions++
      await route.abort('connectionreset')
    })
    await expect(bob.page.getByText('Claim your Taxi delivery', { exact: true })).toBeVisible()
    await bob.page.getByRole('dialog').getByRole('button', { name: 'Claim', exact: true }).click()
    await expect(bob.page.getByTestId('claim-spent')).toBeVisible()
    const id = `taxi-claim:${taxiUrl}:${transfer.id}`
    const held = (await journal(bob.page)).find((row) => row.id === id)!
    expect(held.phase).toBe('submitting')
    expect(held.outpoints).toHaveLength(1)
    expect(held.claimOutpoint).toBeDefined()
    const claimPoint = held.claimOutpoint!
    expect(claimPoint).toEqual(((await status(transfer.id)) as unknown as { outpoint: Outpoint }).outpoint)
    expect((await durableHolds(bob.page)).some((row) => row.id === id)).toBe(true)
    const indexer = new RestIndexerProvider(process.env.TAXI_REGTEST_ARKD_URL!)
    const original = async () => (await indexer.getVtxos({ outpoints: held.outpoints })).vtxos
    expect(await original()).toMatchObject([{ ...held.outpoints[0], value: 1000, isSpent: false }])
    expect((await indexer.getVtxos({ outpoints: [claimPoint] })).vtxos).toMatchObject([
      { ...claimPoint, isSpent: false },
    ])
    const row = (
      await admin<{ advances: { id: string; recoveryLocktime: { kind: string; value: string } }[] }>('advances')
    ).advances.find((row) => row.id === transfer.id)!
    expect(row.recoveryLocktime.kind).toBe('time')
    await invoke('rpc', 'setmocktime', String(BigInt(row.recoveryLocktime.value) + 1n))
    await invoke('mine', '11')
    await expect.poll(async () => (await status(transfer.id)).state, { timeout: 120_000 }).toBe('recovered')
    const spentClaim = (await indexer.getVtxos({ outpoints: [claimPoint] })).vtxos
    expect(spentClaim).toMatchObject([{ ...claimPoint, isSpent: true }])
    await bob.page.bringToFront()
    const dismiss = bob.page.getByRole('button', { name: 'Not now', exact: true })
    if (await dismiss.isVisible()) await dismiss.click()
    await expect
      .poll(async () => (await journal(bob.page)).some((row) => row.id === id), { timeout: 90_000 })
      .toBe(false)
    expect((await durableHolds(bob.page)).some((row) => row.id === id)).toBe(false)
    expect(await original()).toMatchObject([{ ...held.outpoints[0], value: 1000, isSpent: false }])
    expect(await ledger(parties)).toEqual(before)
    await bob.page.reload()
    await navigateHome(bob.page)
    await prePay(bob.page, charlie.address, Boolean(info.project.use.isMobile), 500)
    await bob.page.getByText(tr.send.tapToSign, { exact: true }).click()
    await dismissPaymentSuccess(bob.page)
    const expected = { ...before, bob: shift(before.bob, -500n), charlie: shift(before.charlie, 500n) }
    await expect.poll(() => ledger(parties), { timeout: 60_000 }).toEqual(expected)
    expect(submissions).toBe(1)
    await info.attach('Terminal competing spend safely unlocks the receiver input', {
      body: JSON.stringify({
        transferId: transfer.id,
        held,
        spentClaim: spentClaim.map(({ txid, vout, isSpent, spentBy, arkTxId }) => ({
          txid,
          vout,
          isSpent,
          spentBy,
          arkTxId,
        })),
        originalInputStillUnspentBeforeOrdinarySend: true,
        originalClaimSubmissions: submissions,
        before,
        after: expected,
      }),
      contentType: 'application/json',
    })
    await info.attach('Ordinary transfer succeeds after strict terminal proof', {
      body: await bob.page.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    })
  } finally {
    await restorePolicy(policy)
    await Promise.all(contexts.map((context) => context.close()))
  }
})
