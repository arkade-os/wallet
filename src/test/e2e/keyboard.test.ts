import { Currencies } from '../../lib/types'
import { test, expect, createWallet, navigateHome, navigateToSettings, createWalletWithFiat } from './utils'
import type { Page } from '@playwright/test'

// helper function to navigate to keyboard
async function openKeyboard(page: Page) {
  await navigateHome(page)
  await page.getByText('Receive').click()
  await page.getByText('Add amount').click()
  await page.waitForSelector('text=Save', { state: 'visible' })
}

// helper function to change the display currency in settings
async function changeToFiat(page: Page, fiat: Currencies) {
  await navigateToSettings(page)
  await page.getByText('display', { exact: true }).click()
  await page.getByText('currency').click()
  await page.getByText(fiat).click()
  await page.getByLabel('Go back').click()
  await page.getByLabel('Go back').click()
  await navigateHome(page)
}

// helper function to clear the amount on keyboard
async function clearAmount(page: Page, maxClicks = 10) {
  const backspaceBtn = page.getByTestId('keyboard-x')
  // Click backspace multiple times to ensure amount is cleared
  for (let i = 0; i < maxClicks; i++) {
    await backspaceBtn.click()
  }
}

// helper function to toggle currency on keyboard
async function toggleCurrency(page: Page) {
  await page.locator('[aria-label="Toggle currency"]').click()
}

test('should toggle between sats and FIAT on mobile keyboard', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'This test is only for mobile')

  // setup wallet and open keyboard
  await createWallet(page)
  await changeToFiat(page, Currencies.USD)
  await openKeyboard(page)

  // verify keyboard is visible
  await expect(page.getByText('Amount')).toBeVisible()
  await expect(page.getByTestId('keyboard-1')).toBeVisible()

  // enter a FIAT amount with decimals (e.g., 1.50)
  await page.getByTestId('keyboard-1').click()
  await page.getByTestId('keyboard-.').click() // Decimal point
  await page.getByTestId('keyboard-5').click()
  await page.getByTestId('keyboard-0').click()

  // verify decimal amount is displayed in FIAT
  await expect(page.locator('text=$1.50')).toBeVisible()

  // the secondary amount should be converted to sats
  // the exact sats amount will depend on the exchange rate, but we can verify the format
  await page.waitForSelector('text=/[0-9][0-9]+ sats/', { timeout: 2000 })

  // test decimal input in FIAT mode
  await toggleCurrency(page)

  // clear the amount
  await clearAmount(page)

  // initially should be in sats mode - enter 100 sats
  await page.getByTestId('keyboard-1').click()
  await page.getByTestId('keyboard-0').click()
  await page.getByTestId('keyboard-0').click()

  // verify sats amount is displayed
  await expect(page.getByText('100 sats')).toBeVisible()

  // verify sats conversion
  await page.waitForSelector('text=/[\\$€][0-9.]+/', { timeout: 2000 })

  // save the amount
  await page.getByText('Save').click()

  // verify we're back on the receive page (not the keyboard)
  await expect(page.getByText('Edit amount')).toBeVisible()
})

test('should prevent decimal input in sats mode', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'This test is only for mobile')

  // setup wallet and open keyboard
  await createWallet(page)
  await openKeyboard(page)

  // initially should be in sats mode - enter decimal
  await page.getByTestId('keyboard-5').click()

  // try to enter a decimal point - should be ignored in sats mode
  await page.getByTestId('keyboard-.').click()

  // try to enter another number
  await page.getByTestId('keyboard-0').click()

  // should show 50 sats (decimal point ignored)
  await expect(page.getByText('50 sats')).toBeVisible()
})

test('should limit FIAT decimals to 2 places', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'This test is only for mobile')

  // setup wallet and open keyboard
  await createWallet(page)
  await changeToFiat(page, Currencies.USD)
  await openKeyboard(page)

  // enter 1.99 (valid)
  await page.getByTestId('keyboard-1').click()
  await page.getByTestId('keyboard-.').click()
  await page.getByTestId('keyboard-9').click()
  await page.getByTestId('keyboard-9').click()

  // try to enter a third decimal place - should be ignored
  await page.getByTestId('keyboard-5').click()

  // should still show 1.99 (third decimal ignored)
  await expect(page.locator('text=/[\\$€]1\\.99/')).toBeVisible()
})

test('should limit JPY decimals to 0 places', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'This test is only for mobile')

  // setup wallet and open keyboard
  await createWallet(page)
  await changeToFiat(page, Currencies.JPY)
  await openKeyboard(page)

  // clear any existing amount
  await clearAmount(page)

  // enter some number
  await page.getByTestId('keyboard-5').click()

  // try to enter a decimal point - should be ignored in sats mode
  await page.getByTestId('keyboard-.').click()

  // try to enter another number
  await page.getByTestId('keyboard-0').click()

  // should show 50 sats (decimal point ignored)
  await expect(page.getByText('¥50')).toBeVisible()
})

test('should insert sats in a fiat wallet', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'This test is only for mobile')

  // setup wallet and open keyboard
  await createWalletWithFiat(page)
  await openKeyboard(page)

  // move locally to sats mode
  await toggleCurrency(page)

  // enter some number
  await page.getByTestId('keyboard-5').click()
  await page.getByTestId('keyboard-0').click()
  await page.getByTestId('keyboard-0').click()
  await page.getByTestId('keyboard-0').click()
  await expect(page.locator('text=5000 sats')).toBeVisible()

  await page.getByTestId('save-amount').click()

  await page.waitForSelector('text=Edit amount', { state: 'visible' })
  await expect(page.locator('text=Requesting 5,000 sats')).toBeVisible()
})

test('should persist sats in a sats wallet', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'This test is only for mobile')

  // setup wallet and open keyboard
  await createWallet(page)
  await openKeyboard(page)

  // toggle currency shouldn't be there
  await expect(page.locator('[aria-label="Toggle currency"]')).toHaveCount(0)

  // enter some number
  await page.getByTestId('keyboard-5').click()
  await page.getByTestId('keyboard-0').click()
  await page.getByTestId('keyboard-0').click()
  await page.getByTestId('keyboard-0').click()
  await expect(page.locator('text=5000 sats')).toBeVisible()

  await page.getByTestId('save-amount').click()

  await page.waitForSelector('text=Edit amount', { state: 'visible' })
  await expect(page.locator('text=Requesting 5,000 sats')).toBeVisible()
  await page.locator('text=Edit amount').click()
  await expect(page.locator('text=5000 sats')).toBeVisible()
})

test('should persist fiat in a fiat wallet', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'This test is only for mobile')

  // setup wallet and open keyboard
  await createWalletWithFiat(page)
  await openKeyboard(page)

  // toggle currency should be there
  await expect(page.locator('[aria-label="Toggle currency"]')).toHaveCount(1)

  // enter some number
  await page.getByTestId('keyboard-5').click()
  await expect(page.locator('text=$5.00')).toBeVisible()

  await page.getByTestId('save-amount').click()

  await page.waitForSelector('text=Edit amount', { state: 'visible' })
  await page.locator('text=Edit amount').click()
  await expect(page.locator('text=$5.00')).toBeVisible()
})
