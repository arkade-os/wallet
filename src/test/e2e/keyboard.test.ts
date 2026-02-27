import { test, expect, type Page } from '@playwright/test'
import { createWallet } from './utils'

// helper function to setup wallet and navigate to keyboard
async function setupWalletAndOpenKeyboard(page: Page) {
  await createWallet(page)
  await page.getByText('Receive').click()
  await page.locator('ion-input[name="receive-amount"] input').click()
  await page.waitForSelector('text=Save', { state: 'visible' })
}

// helper function to clear the amount on keyboard
async function clearAmount(page: Page, maxClicks = 10) {
  const backspaceBtn = page.getByTestId('keyboard-x')
  // Click backspace multiple times to ensure amount is cleared
  for (let i = 0; i < maxClicks; i++) {
    await backspaceBtn.click()
  }
}

test('should toggle between bitcoin and fiat on mobile keyboard', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'This test is only for mobile')

  // setup wallet and open keyboard
  await setupWalletAndOpenKeyboard(page)

  // verify keyboard is visible
  await expect(page.getByText('Amount')).toBeVisible()
  await expect(page.getByTestId('keyboard-1')).toBeVisible()

  // initially should be in bitcoin mode - enter 100
  await page.getByTestId('keyboard-1').click()
  const btn0 = page.getByTestId('keyboard-0')
  await btn0.click()
  await btn0.click()

  // verify bitcoin amount is displayed
  await expect(page.getByText('₿100')).toBeVisible()

  // find and click the swap icon to toggle to FIAT
  // the swap icon is in the header area
  const swapButton = page.locator('[aria-label="Toggle currency"]')
  await expect(swapButton).toBeVisible()
  await swapButton.click()

  // after toggling, the amount should be converted to FIAT
  // the exact USD amount will depend on the exchange rate, but we can verify the format
  await expect(page.locator('text=/[0-9.]+\\s+(USD|EUR)/')).toBeVisible()

  // click swap again to go back to bitcoin
  await swapButton.click()

  // should show ₿ again
  await expect(page.getByText(/₿/)).toBeVisible()

  // test decimal input in FIAT mode
  await swapButton.click() // Switch to FIAT

  // clear the amount
  await clearAmount(page)

  // enter a FIAT amount with decimals (e.g., 1.50)
  await page.getByTestId('keyboard-1').click()
  await page.getByTestId('keyboard-.').click() // Decimal point
  await page.getByTestId('keyboard-5').click()
  await btn0.click()

  // verify decimal amount is displayed in FIAT
  await expect(page.locator('text=/1\\.50\\s+(USD|EUR)/')).toBeVisible()

  // switch back to bitcoin to verify conversion
  await swapButton.click()

  // should show the converted bitcoin value
  await expect(page.getByText(/₿/)).toBeVisible()

  // save the amount
  await page.getByText('Save').click()

  // verify we're back on the receive page (not the keyboard)
  await expect(page.getByText('Continue')).toBeVisible()
})

test('should prevent decimal input in bitcoin mode', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'This test is only for mobile')

  // setup wallet and open keyboard
  await setupWalletAndOpenKeyboard(page)

  // enter a number in bitcoin mode
  await page.getByTestId('keyboard-5').click()

  // try to enter a decimal point - should be ignored in bitcoin mode
  await page.getByTestId('keyboard-.').click()

  // try to enter another number
  await page.getByTestId('keyboard-0').click()

  // should show ₿50 (decimal point ignored)
  await expect(page.getByText('₿50')).toBeVisible()
})

test('should limit FIAT decimals to 2 places', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'This test is only for mobile')

  // setup wallet and open keyboard
  await setupWalletAndOpenKeyboard(page)

  // toggle to FIAT mode
  const swapButton = page.locator('[aria-label="Toggle currency"]')
  await swapButton.click()

  // clear any existing amount
  await clearAmount(page)

  // enter 1.99 (valid)
  await page.getByTestId('keyboard-1').click()
  await page.getByTestId('keyboard-.').click()
  await page.getByTestId('keyboard-9').click()
  await page.getByTestId('keyboard-9').click()

  // try to enter a third decimal place - should be ignored
  await page.getByTestId('keyboard-5').click()

  // should still show 1.99 (third decimal ignored)
  await expect(page.locator('text=/1\\.99\\s+(USD|EUR)/')).toBeVisible()
})
