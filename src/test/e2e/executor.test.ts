import { execFile } from 'child_process'
import { promisify } from 'util'
import type { Browser, BrowserContext, Page } from '@playwright/test'
import {
  test,
  expect,
  createWallet,
  dismissPaymentSuccess,
  navigateHome,
  prepareWalletPage,
  receiveOffchain,
  receiveOnchain,
  waitForPaymentReceived,
  waitForWalletPage,
} from './utils'
import { faucetOffchain } from './fundedWallet'
import { translations } from '../../lib/i18n'

const execFileAsync = promisify(execFile)
const tr = translations.en

// These tests run against the regtest Executor (`executor` profile, http://localhost:7280).
// CI's default of 5 retries would spend about 18 minutes on a broken test 2.
test.describe.configure({ retries: 1 })

const someArkAddress =
  'tark1qr340xg400jtxat9hdd0ungyu6s05zjtdf85uj9smyzxshf98nda' +
  'h6u2nredqtn0cr4p4zqz53gsmhju4l9t7x47kzleesa9dprx7e56xhzlen'

interface Addresses {
  ark: string
  btc: string
}

// playwright.config.ts serves the app twice: with the Executor off (the default baseURL) and on. The build
// switch overrides the stored config, so the wallet moves between them with its storage instead.
const EXECUTOR_OFF_URL = 'http://localhost:3002'
const EXECUTOR_ON_URL = 'http://localhost:3004'

type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>

/** The same storage, served from `origin`: localStorage and IndexedDB are per origin. */
function onOrigin(state: StorageState, origin: string): StorageState {
  return { ...state, origins: state.origins.map((o) => (o.origin === EXECUTOR_OFF_URL ? { ...o, origin } : o)) }
}

/** Opens the wallet in `storageState` on the Executor-on server. Passwordless, so it unlocks by itself. */
async function openExecutorWallet(browser: Browser, storageState: StorageState): Promise<BrowserContext> {
  const context = await browser.newContext({ baseURL: EXECUTOR_ON_URL, storageState })
  const page = await context.newPage()
  await prepareWalletPage(page)
  await page.goto('/')
  await waitForWalletPage(page)
  return context
}

/** Reads the Receive addresses until both differ from `before`, i.e. the Executor registration has landed. */
async function waitForExecutorAddresses(page: Page, before: Addresses, timeout = 30_000): Promise<Addresses> {
  let current = before
  // Polling covers a first registration that takes longer than the 5 s Receive waits for it.
  await expect
    .poll(
      async () => {
        current = { ark: await receiveOffchain(page), btc: await receiveOnchain(page) }
        return { ark: current.ark !== before.ark, btc: current.btc !== before.btc }
      },
      {
        timeout,
        intervals: [500],
        message: 'Receive still shows the wallet’s own addresses: no Executor registration',
      },
    )
    .toEqual({ ark: true, btc: true })
  return current
}

/** Creates a static wallet with the Executor off, then opens it with the Executor on and waits for the registration. */
async function createExecutorWallet(
  browser: Browser,
): Promise<{ context: BrowserContext; page: Page; before: Addresses; after: Addresses }> {
  // A context of its own, so that closing it stops the wallet's service worker.
  const offContext = await browser.newContext({ baseURL: EXECUTOR_OFF_URL })
  const offPage = await offContext.newPage()
  await prepareWalletPage(offPage)
  await createWallet(offPage)
  // The Executor is off here, so these are the wallet's own addresses. Comparing with them proves that
  // `after` holds the Executor's: otherwise a slow registration would hand back the wallet's own address
  // and the test would time out with no clue why.
  const before = { ark: await receiveOffchain(offPage), btc: await receiveOnchain(offPage) }
  const state = await offContext.storageState({ indexedDB: true })
  await offContext.close()

  const context = await openExecutorWallet(browser, onOrigin(state, EXECUTOR_ON_URL))
  const page = context.pages()[0]
  const after = await waitForExecutorAddresses(page, before)
  return { context, page, before, after }
}

/** Confirmed BTC at `address`, from scantxoutset. */
async function onchainBalance(address: string): Promise<number> {
  const { stdout } = await execFileAsync('node', [
    'regtest/regtest.mjs',
    'rpc',
    'scantxoutset',
    'start',
    JSON.stringify([`addr(${address})`]),
  ])
  return JSON.parse(stdout).total_amount
}

async function regtest(...args: string[]): Promise<void> {
  await execFileAsync('node', ['regtest/regtest.mjs', ...args])
}

test('registers on unlock, receives on the renewal address, spends it', async ({ browser }) => {
  // The wallet loads twice: once with the Executor off, once on.
  test.setTimeout(120_000)

  const { context, page, before, after } = await createExecutorWallet(browser)
  try {
    // Any wallet with renewal registered shows the renewal contract as its Ark address...
    expect(after.ark).not.toBe(before.ark)
    // ...and the boarding address the Executor watches as its BTC address.
    expect(after.btc).not.toBe(before.btc)

    await faucetOffchain(after.ark, 10_000)
    await waitForPaymentReceived(page)
    await expect(page.getByText('+ 10,000 sats')).toBeVisible()

    // Max forces every coin at the renewal contract to be spent with the wallet's key.
    await navigateHome(page)
    await page.getByText(tr.wallet.send, { exact: true }).click()
    await page.locator('input[name="send-address"]').fill(someArkAddress)
    await page.getByTestId('input-amount-max').click()
    await page.getByText(tr.common.continue, { exact: true }).click()
    await page.getByText(tr.send.tapToSign).click()
    await page.waitForSelector(`text=${tr.send.paymentSent}`, { timeout: 30_000 })
    await dismissPaymentSuccess(page)
    await expect(page.getByText('- 10,000 sats')).toBeVisible({ timeout: 10_000 })
  } finally {
    await context.close()
  }
})

test('boards an on-chain deposit while the wallet is offline', async ({ browser }, testInfo) => {
  // Nothing in it depends on the viewport, and it is the slow one.
  test.skip(testInfo.project.name !== 'Google Chrome', 'viewport independent: run on desktop only')
  test.setTimeout(180_000)

  // The wallet must be fully gone: closing only the page leaves the service worker running in the context.
  const {
    context: ctxA,
    after: { btc },
  } = await createExecutorWallet(browser)
  const state = await ctxA.storageState({ indexedDB: true })
  await ctxA.close()

  // The wallet is offline: only the Executor can board this deposit.
  await regtest('faucet', btc, '0.0001', '--confirm')
  // Without this check, a faucet that sent elsewhere would let the next wait pass at once.
  expect(await onchainBalance(btc)).toBe(0.0001)

  // The boarding UTXO is spent once the round commitment confirms. Nobody else holds the key, so this
  // proves the Executor boarded it.
  await expect
    .poll(
      async () => {
        await regtest('mine', '1')
        return onchainBalance(btc)
      },
      { timeout: 120_000, intervals: [2_000], message: 'the Executor never boarded the deposit' },
    )
    .toBe(0)

  const ctxB = await openExecutorWallet(browser, state)
  try {
    const pageB = ctxB.pages()[0]

    // Poll: the first sync after reopening may be lazy.
    await expect(pageB.getByTestId('main-balance')).toContainText('10,000', { timeout: 60_000 })
    await expect(pageB.getByText(tr.transaction.received)).toBeVisible()
  } finally {
    await ctxB.close()
  }
})
