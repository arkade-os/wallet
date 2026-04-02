import { test, expect, createWallet } from './utils'
import type { Page } from '@playwright/test'

async function mockPriceFeed(page: Page, price = 67000) {
  await page.route('**/api/price', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ price }) })
  })
}

async function navigateToBanco(page: Page) {
  await page.getByTestId('tab-apps').click()
  await page.getByTestId('app-banco').click()
  await page.waitForSelector('text=Banco', { state: 'visible' })
}

async function waitForPrice(page: Page) {
  // Wait for the rate line to appear, meaning price loaded
  await page.waitForSelector('text=/1 .+ =/i', { state: 'visible', timeout: 10000 })
}

async function typePayAmount(page: Page, amount: string) {
  const input = page.locator('ion-input[data-testid="banco-pay-amount"] input')
  await input.click()
  await input.fill(amount)
  // Trigger ionInput by pressing a key then backspacing — ensures Ionic event fires
  await input.press('End')
}

// ── Basic form display ──

test('should display swap form with price from feed', async ({ page }) => {
  await mockPriceFeed(page)
  await createWallet(page)
  await navigateToBanco(page)

  await expect(page.getByText('You pay')).toBeVisible()
  await expect(page.getByText('You receive')).toBeVisible()
  await expect(page.getByText('Enter an amount')).toBeVisible()
  // Verify asset labels from configured pair (BTC/USDT)
  await expect(page.getByTestId('banco-pay-card').getByText('BTC')).toBeVisible()
  await expect(page.getByTestId('banco-receive-card').getByText('USDT')).toBeVisible()
})

test('should display rate when price loads', async ({ page }) => {
  await mockPriceFeed(page, 67000)
  await createWallet(page)
  await navigateToBanco(page)

  await expect(page.getByText(/1 BTC = 67/)).toBeVisible()
})

// ── Amount calculation ──

test('should auto-calculate receive amount when entering pay amount', async ({ page }) => {
  await mockPriceFeed(page, 67000)
  await createWallet(page)
  await navigateToBanco(page)
  await waitForPrice(page)

  await typePayAmount(page, '1000')
  await expect(page.getByTestId('banco-receive-amount')).not.toHaveText('0', { timeout: 5000 })
})

test('should clear receive amount when pay amount is cleared', async ({ page }) => {
  await mockPriceFeed(page, 67000)
  await createWallet(page)
  await navigateToBanco(page)
  await waitForPrice(page)

  await typePayAmount(page, '1000')
  await expect(page.getByTestId('banco-receive-amount')).not.toHaveText('0', { timeout: 5000 })

  await typePayAmount(page, '')
  await expect(page.getByTestId('banco-receive-amount')).toHaveText('0')
})

test('should show zero receive for zero pay amount', async ({ page }) => {
  await mockPriceFeed(page, 67000)
  await createWallet(page)
  await navigateToBanco(page)
  await waitForPrice(page)

  await typePayAmount(page, '0')
  await expect(page.getByTestId('banco-receive-amount')).toHaveText('0')
})

test('should handle decimal pay amount', async ({ page }) => {
  await mockPriceFeed(page, 67000)
  await createWallet(page)
  await navigateToBanco(page)
  await waitForPrice(page)

  await typePayAmount(page, '0.5')
  await expect(page.getByTestId('banco-receive-amount')).not.toHaveText('0', { timeout: 5000 })
})

// ── Flip direction ──

test('should flip direction when clicking swap icon', async ({ page }) => {
  await mockPriceFeed(page)
  await createWallet(page)
  await navigateToBanco(page)

  // Before flip: pay card shows BTC
  await expect(page.getByTestId('banco-pay-card').getByText('BTC')).toBeVisible()
  await expect(page.getByTestId('banco-receive-card').getByText('USDT')).toBeVisible()

  await page.getByTestId('banco-flip').click()

  // After flip: pay card shows USDT, receive card shows BTC
  await expect(page.getByTestId('banco-pay-card').getByText('USDT')).toBeVisible()
  await expect(page.getByTestId('banco-receive-card').getByText('BTC')).toBeVisible()
})

test('should clear amounts when flipping direction', async ({ page }) => {
  await mockPriceFeed(page, 67000)
  await createWallet(page)
  await navigateToBanco(page)
  await waitForPrice(page)

  await typePayAmount(page, '1000')
  await expect(page.getByTestId('banco-receive-amount')).not.toHaveText('0', { timeout: 5000 })

  await page.getByTestId('banco-flip').click()

  // Amounts should be cleared after flip
  await expect(page.getByTestId('banco-receive-amount')).toHaveText('0')
})

test('should recalculate with inverse rate after flip', async ({ page }) => {
  await mockPriceFeed(page, 2) // 1 BTC = 2 USDT
  await createWallet(page)
  await navigateToBanco(page)
  await waitForPrice(page)

  // BTC → USDT: 100 BTC = 200 USDT
  await typePayAmount(page, '100')
  const receiveBeforeFlip = await page.getByTestId('banco-receive-amount').textContent()

  await page.getByTestId('banco-flip').click()

  // USDT → BTC: 100 USDT = 50 BTC (inverse rate)
  await typePayAmount(page, '100')
  await page.waitForTimeout(500) // let Ionic re-render
  const receiveAfterFlip = await page.getByTestId('banco-receive-amount').textContent()

  expect(receiveBeforeFlip).not.toBe(receiveAfterFlip)
})

// ── Validation ──

test('should validate insufficient balance', async ({ page }) => {
  await mockPriceFeed(page, 1)
  await createWallet(page)
  await navigateToBanco(page)

  await typePayAmount(page, '5000')
  await expect(page.getByText('Insufficient balance')).toBeVisible()
})

test('should not show insufficient balance for non-BTC pay asset', async ({ page }) => {
  await mockPriceFeed(page, 1)
  await createWallet(page)
  await navigateToBanco(page)

  // Flip so USDT is the pay asset (not BTC)
  await page.getByTestId('banco-flip').click()

  // Enter large amount — should NOT show insufficient balance since it's not BTC
  await typePayAmount(page, '999999')
  await expect(page.getByText('Insufficient balance')).not.toBeVisible()
})

test('should keep swap button disabled when amount is zero', async ({ page }) => {
  await mockPriceFeed(page)
  await createWallet(page)
  await navigateToBanco(page)

  await expect(page.getByText('Enter an amount')).toBeVisible()
  // Button component uses IonButton which renders ion-button
  const swapButton = page.locator('ion-button', { hasText: 'Swap' })
  await expect(swapButton).toHaveAttribute('aria-disabled', 'true')
})

// ── Price feed errors ──

test('should show error when price feed is unreachable', async ({ page }) => {
  await page.route('**/api/price', (route) => route.abort('connectionrefused'))
  await createWallet(page)
  await navigateToBanco(page)

  await expect(page.getByText('Unable to fetch price')).toBeVisible()
})

test('should show error when price feed returns invalid data', async ({ page }) => {
  await page.route('**/api/price', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ invalid: true }) })
  })
  await createWallet(page)
  await navigateToBanco(page)

  await expect(page.getByText('Unable to fetch price')).toBeVisible()
})

test('should show error when price feed returns zero', async ({ page }) => {
  await page.route('**/api/price', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ price: 0 }) })
  })
  await createWallet(page)
  await navigateToBanco(page)

  await expect(page.getByText('Unable to fetch price')).toBeVisible()
})

test('should show error when price feed returns negative', async ({ page }) => {
  await page.route('**/api/price', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ price: -5 }) })
  })
  await createWallet(page)
  await navigateToBanco(page)

  await expect(page.getByText('Unable to fetch price')).toBeVisible()
})

test('should disable swap button when price feed fails', async ({ page }) => {
  await page.route('**/api/price', (route) => route.abort('connectionrefused'))
  await createWallet(page)
  await navigateToBanco(page)

  await expect(page.getByText('Unable to fetch price')).toBeVisible()
  const swapButton = page.locator('ion-button', { hasText: 'Swap' })
  await expect(swapButton).toHaveAttribute('aria-disabled', 'true')
})

// ── History list (empty state) ──

test('should not show history list when no swaps exist', async ({ page }) => {
  await mockPriceFeed(page)
  await createWallet(page)
  await navigateToBanco(page)

  await expect(page.getByText('RECENT SWAPS')).not.toBeVisible()
})

// Full-stack swap tests are in bancoSwaps.test.ts (SDK-level integration tests).
