import { expect, test, type Page } from '@playwright/test'
import { RestIndexerProvider } from '@arkade-os/sdk'
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
  tr,
  taxiUrl,
  type Policy,
} from './helpers'
import { handleKeyboardInput, navigateHome } from '../utils'

type Hold = { id: string; outpoints: { txid: string; vout: number }[]; phase?: string }

const journal = (page: Page): Promise<Hold[]> =>
  page.evaluate(() =>
    Object.keys(localStorage)
      .filter((key) => key.startsWith('taxi-input-reservations:regtest:'))
      .flatMap((key) => JSON.parse(localStorage.getItem(key)!)),
  )

const durableHolds = (page: Page): Promise<Hold[]> =>
  page.evaluate(async () => {
    const databases = await indexedDB.databases()
    return (
      await Promise.all(
        databases
          .filter(({ name }) => name?.startsWith('arkade-reservations-'))
          .map(
            ({ name }) =>
              new Promise<Hold[]>((resolve, reject) => {
                const opened = indexedDB.open(name!)
                opened.onerror = () => reject(opened.error)
                opened.onsuccess = () => {
                  const db = opened.result
                  const transaction = db.transaction('reservations', 'readonly')
                  const rows = transaction.objectStore('reservations').getAll()
                  rows.onsuccess = () => resolve(rows.result)
                  rows.onerror = () => reject(rows.error)
                  transaction.oncomplete = () => db.close()
                }
              }),
          ),
      )
    ).flat()
  })

test('Ambiguous Taxi claim keeps its unspent input reserved across tab and worker restart', async ({
  browser,
}, testInfo) => {
  const contexts = await Promise.all(
    [0, 1, 2].map(() =>
      browser.newContext({
        ...testInfo.project.use,
        ...testInfo.project.use.contextOptions,
        baseURL: testInfo.project.use.baseURL,
      }),
    ),
  )
  const policy = await admin<Policy>('policy')
  try {
    await admin('policy', 'PATCH', { assetRules: [rule(null)] })
    const alice = await actor(await contexts[0].newPage(), 5000)
    const bob = await actor(await contexts[1].newPage(), 1000)
    const charlie = await actor(await contexts[2].newPage(), 0)
    const { arkAddress } = await admin<{ arkAddress: string }>('funding')
    const parties = { alice: alice.address, bob: bob.address, charlie: charlie.address, taxi: arkAddress }
    const known = await advances()
    await send(alice, bob.address, '100', 'Receiver uses own sats')
    await testInfo.attach('Subdust delivery approval', {
      body: await alice.page.screenshot(),
      contentType: 'image/png',
    })
    await pay(alice)
    const [transfer] = await fresh(known)
    expect(transfer.kind).toBe('covenant')
    const before = await ledger(parties)
    const { emulatorUrl } = await (await fetch(`${taxiUrl}/v1/info`)).json()
    const endpoint = new URL('/v1/tx', emulatorUrl).href
    let interrupted = 0
    await contexts[1].route(endpoint, async (route) => {
      if (route.request().method() !== 'POST') return route.continue()
      interrupted++
      await route.abort('connectionreset')
    })
    await expect(bob.page.getByText('Claim your Taxi delivery', { exact: true })).toBeVisible()
    await testInfo.attach('Free Taxi claim sheet', { body: await bob.page.screenshot(), contentType: 'image/png' })
    await bob.page.getByRole('dialog').getByRole('button', { name: 'Claim', exact: true }).click()
    await expect(bob.page.getByTestId('claim-spent')).toBeVisible()
    expect(interrupted).toBe(1)
    const id = `taxi-claim:${taxiUrl}:${transfer.id}`
    const recorded = (await journal(bob.page)).find((hold) => hold.id === id)!
    expect(recorded).toMatchObject({ id, phase: 'submitting' })
    expect(recorded.outpoints).toHaveLength(1)
    const indexer = new RestIndexerProvider(process.env.TAXI_REGTEST_ARKD_URL!)
    const heldInput = async () => {
      const { vtxos } = await indexer.getVtxos({ outpoints: recorded.outpoints })
      expect(vtxos).toHaveLength(1)
      expect(vtxos[0]).toMatchObject({ ...recorded.outpoints[0], value: 1000, isSpent: false })
      return vtxos.map(({ txid, vout, value, isSpent }) => ({ txid, vout, value, isSpent }))
    }
    const unspentBefore = await heldInput()
    expect(await durableHolds(bob.page)).toContainEqual({ id, outpoints: recorded.outpoints })
    expect(await ledger(parties)).toEqual(before)

    const next = await contexts[1].newPage()
    await next.bringToFront()
    await next.goto('/')
    const cdp = await contexts[1].newCDPSession(next)
    const versions = new Map<string, { versionId: string; scriptURL: string; runningStatus: string }>()
    const transitions: string[] = []
    cdp.on('ServiceWorker.workerVersionUpdated', ({ versions: updated }) => {
      for (const version of updated) {
        versions.set(version.versionId, version)
        if (version.scriptURL.endsWith('/wallet-service-worker.mjs')) transitions.push(version.runningStatus)
      }
    })
    await cdp.send('ServiceWorker.enable')
    await expect
      .poll(
        () =>
          [...versions.values()].filter(
            (version) =>
              version.scriptURL === new URL('/wallet-service-worker.mjs', testInfo.project.use.baseURL).href &&
              version.runningStatus === 'running',
          ).length,
      )
      .toBe(1)
    const worker = [...versions.values()].find(
      (version) => version.scriptURL.endsWith('/wallet-service-worker.mjs') && version.runningStatus === 'running',
    )!
    await bob.page.close()
    await cdp.send('ServiceWorker.stopWorker', { versionId: worker.versionId })
    await expect.poll(() => transitions.includes('stopped')).toBe(true)
    await next.reload()
    await expect.poll(() => transitions.slice(transitions.lastIndexOf('stopped') + 1).includes('running')).toBe(true)
    expect(await journal(next)).toContainEqual(recorded)
    expect(await durableHolds(next)).toContainEqual({ id, outpoints: recorded.outpoints })

    await next.bringToFront()
    const dismiss = next.getByRole('button', { name: 'Not now', exact: true })
    await expect(dismiss).toBeVisible()
    await dismiss.click()
    await expect(dismiss).not.toBeVisible()
    await navigateHome(next)
    await next.getByText(tr.wallet.send, { exact: true }).click()
    await next.locator('input[name="send-address"]').fill(charlie.address)
    const amount = next.locator('input[name="send-amount"]')
    if (testInfo.project.use.isMobile) {
      await amount.click()
      await handleKeyboardInput(next, 500)
    } else await amount.fill('500')
    if (await dismiss.isVisible()) await dismiss.click()
    await expect(next.getByTestId('taxi-send-mode')).not.toBeVisible()
    await expect(next.getByRole('button', { name: tr.send.insufficientFunds, exact: true })).toBeDisabled()
    await expect(next.getByText('0 sats available', { exact: true })).toBeVisible()
    expect(await ledger(parties)).toEqual(before)
    expect(await durableHolds(next)).toContainEqual({ id, outpoints: recorded.outpoints })
    await testInfo.attach('Ordinary send excludes the reserved input', {
      body: await next.screenshot(),
      contentType: 'image/png',
    })
    await testInfo.attach('Persistent unspent Taxi hold financial evidence', {
      body: JSON.stringify({
        injected: 'emulator submit connection reset before forwarding; provider acceptance is not asserted',
        transferId: transfer.id,
        held: recorded,
        unspentBefore,
        unspentAfter: await heldInput(),
        durable: await durableHolds(next),
        workerTransitions: transitions,
        before,
        after: await ledger(parties),
      }),
      contentType: 'application/json',
    })
  } finally {
    await restorePolicy(policy)
    await Promise.all(contexts.map((context) => context.close()))
  }
})
