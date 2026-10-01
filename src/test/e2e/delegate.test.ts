import { test, expect } from '@playwright/test'
import {
  createWallet,
  fundWallet,
  navigateHome,
  navigateToSettings,
  readClipboard,
  receiveOffchain,
  waitForWalletPage,
} from './utils'

test('should toggle delegates', async ({ page }) => {
  test.setTimeout(60000)
  // create wallet
  await createWallet(page)

  await navigateToSettings(page)
  await page.getByText('advanced', { exact: true }).click()
  await page.getByText('delegates', { exact: true }).click()

  let toggle = page.getByTestId('toggle-delegates')
  await expect(toggle).toBeVisible()

  // delegate may default to off in CI (no delegator service)
  const initialChecked = await toggle.getAttribute('data-checked')

  await toggle.click()

  // toggle triggers window.location.reload(), wait for wallet to load
  await waitForWalletPage(page)
  await navigateToSettings(page)
  await page.getByText('advanced', { exact: true }).click()
  await page.getByText('delegates', { exact: true }).click()
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

// Needs a delegatee on the wallet's regtest stack, with the default templates registered and
// trusted (see README "Delegatee e2e"); skipped when none answers.
const DELEGATEE_URL = process.env.VITE_DELEGATEE_URL ?? 'http://localhost:7080'

test('should receive and keep coins at the delegated renewal address', async ({ page }) => {
  const reachable = await fetch(`${DELEGATEE_URL}/v1/info`)
    .then((r) => r.ok)
    .catch(() => false)
  test.skip(!reachable, `no delegatee at ${DELEGATEE_URL}`)
  test.setTimeout(180000)

  await createWallet(page)
  await fundWallet(page, 5000)

  await navigateToSettings(page)
  await page.getByText('advanced', { exact: true }).click()
  await page.getByText('delegates', { exact: true }).click()
  const toggle = page.getByTestId('toggle-delegates')
  if ((await toggle.getAttribute('data-checked')) !== 'true') {
    await toggle.click()
    await waitForWalletPage(page)
  }

  // enabling moves the coins to the renewal address, the card shows them
  await navigateToSettings(page)
  await page.getByText('advanced', { exact: true }).click()
  await page.getByText('delegates', { exact: true }).click()
  await expect(page.getByText(/delegated balance: 5,000 sats/)).toBeVisible({ timeout: 90000 })
  await page.getByText(/renewal address:/).click()
  const renewalAddress = await readClipboard(page)

  // the receive address is the renewal address
  await navigateHome(page)
  expect(await receiveOffchain(page)).toBe(renewalAddress)
})
