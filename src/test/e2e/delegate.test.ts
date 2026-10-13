import { test, expect, type Page } from '@playwright/test'
import { translations } from '../../lib/i18n'
import { faucetOffchain } from './fundedWallet'
import {
  createWallet,
  fundWallet,
  navigateHome,
  navigateToSettings,
  readClipboard,
  receiveOffchain,
  waitForWalletPage,
} from './utils'

const tr = translations.en

test('should toggle delegates', async ({ page }) => {
  test.setTimeout(60000)
  // create wallet
  await createWallet(page)

  await navigateToSettings(page)
  await page.getByText(tr.settings.advanced, { exact: true }).click()
  await page.getByText(tr.settings.delegates, { exact: true }).click()

  let toggle = page.getByTestId('toggle-delegates')
  await expect(toggle).toBeVisible()

  // delegate may default to off in CI (no delegator service)
  const initialChecked = await toggle.getAttribute('data-checked')

  await toggle.click()

  // toggle triggers window.location.reload(), wait for wallet to load
  await waitForWalletPage(page)
  await navigateToSettings(page)
  await page.getByText(tr.settings.advanced, { exact: true }).click()
  await page.getByText(tr.settings.delegates, { exact: true }).click()
  toggle = page.getByTestId('toggle-delegates')

  const expectedAfterToggle = initialChecked === 'true' ? 'false' : 'true'

  if (expectedAfterToggle === 'true') {
    expect(await toggle.getAttribute('data-checked')).toBe('true')
    await expect(page.getByTestId('delegate-card')).toBeVisible()
  } else {
    expect(await toggle.getAttribute('data-checked')).toBe('false')
    await expect(page.getByTestId('delegate-card')).not.toBeVisible()
  }
})

// The delegatee of arkade-regtest's `delegatee` profile, which trusts its default templates;
// skipped when none answers.
const DELEGATEE_URL = process.env.VITE_DELEGATEE_URL ?? 'http://localhost:7280'
const delegateeReachable = () =>
  fetch(`${DELEGATEE_URL}/v1/info`)
    .then((r) => r.ok)
    .catch(() => false)

const openDelegates = async (page: Page) => {
  await navigateToSettings(page)
  await page.getByText(tr.settings.advanced, { exact: true }).click()
  await page.getByText(tr.settings.delegates, { exact: true }).click()
}

// flips the toggle to `on` when it is not, then waits for the reload it triggers
const setDelegation = async (page: Page, on: boolean) => {
  await openDelegates(page)
  const toggle = page.getByTestId('toggle-delegates')
  if (((await toggle.getAttribute('data-checked')) === 'true') !== on) {
    await toggle.click()
    await waitForWalletPage(page)
  }
}

test('should receive and keep coins at the delegated renewal address', async ({ page }) => {
  test.skip(!(await delegateeReachable()), `no delegatee at ${DELEGATEE_URL}`)
  test.setTimeout(180000)

  await createWallet(page)
  await fundWallet(page, 5000)

  await navigateToSettings(page)
  await page.getByText(tr.settings.advanced, { exact: true }).click()
  await page.getByText(tr.settings.delegates, { exact: true }).click()
  const toggle = page.getByTestId('toggle-delegates')
  if ((await toggle.getAttribute('data-checked')) !== 'true') {
    await toggle.click()
    await waitForWalletPage(page)
  }

  // enabling moves the coins to the renewal address, the card shows them
  await navigateToSettings(page)
  await page.getByText(tr.settings.advanced, { exact: true }).click()
  await page.getByText(tr.settings.delegates, { exact: true }).click()
  await expect(page.getByText(/delegated balance: 5,000 sats/)).toBeVisible({ timeout: 90000 })
  await page.getByText(/renewal address:/).click()
  const renewalAddress = await readClipboard(page)

  // the receive address is the renewal address
  await navigateHome(page)
  expect(await receiveOffchain(page)).toBe(renewalAddress)
})

test('should migrate an old wallet to the delegatee in the background', async ({ page }) => {
  test.skip(!(await delegateeReachable()), `no delegatee at ${DELEGATEE_URL}`)
  test.setTimeout(240000)

  // an old wallet: coins at its own default address
  await createWallet(page)
  await setDelegation(page, false)
  await navigateHome(page)
  await fundWallet(page, 5000)
  const oldAddress = await receiveOffchain(page)

  // the updated wallet migrates them on startup, the receive address becomes the renewal one
  await setDelegation(page, true)
  await openDelegates(page)
  await expect(page.getByText(/delegated balance: 5,000 sats/)).toBeVisible({ timeout: 90000 })
  await page.getByText(/renewal address:/).click()
  const renewalAddress = await readClipboard(page)
  await navigateHome(page)
  expect(await receiveOffchain(page)).toBe(renewalAddress)
  expect(renewalAddress).not.toBe(oldAddress)

  // a payment to the retired address still arrives, and the next startup moves it too
  await navigateHome(page)
  await faucetOffchain(oldAddress, 1000)
  await page.reload()
  await waitForWalletPage(page)
  await openDelegates(page)
  await expect(page.getByText(/delegated balance: 6,000 sats/)).toBeVisible({ timeout: 90000 })
})
