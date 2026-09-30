import { test, expect, createWallet, fundWallet, navigateToSwaps, createWalletWithFiat } from './utils'
import { translations } from '../../lib/i18n'

const tr = translations.en

test.skip('swap BTC <-> RGT using BTC as currency', async ({ page }) => {
  await createWallet(page)
  await fundWallet(page, 5000)

  // phase 1: swap BTC to RGT
  await navigateToSwaps(page)

  // select BTC as asset to swap from
  await expect(page.getByText('Bitcoin')).toBeVisible()
  await expect(page.getByText('Regtest Asset')).toBeVisible()
  await page.getByTestId('swap-asset-row-sats').click()

  // select RGT as asset to swap to
  page.locator('.swap-receive-card').first().click()
  await page.getByTestId('swap-asset-row-rgt').click()

  // insert 2100 sats to swap
  await page.locator('[aria-label="2"]').click()
  await expect(page.getByText(tr.swap.amountTooSmall)).toBeVisible()
  await page.locator('[aria-label="1"]').click()
  await expect(page.getByText(tr.swap.amountTooSmall)).toBeVisible()
  await page.locator('[aria-label="0"]').click()
  await expect(page.getByText(tr.swap.amountTooSmall)).toBeVisible()
  await page.locator('[aria-label="0"]').click()
  await expect(page.getByText(tr.swap.amountTooSmall)).not.toBeVisible()

  await page.getByText(tr.common.continue).click()

  await page.getByText(tr.swap.confirmSwap).click()

  await page.waitForSelector(`text=${tr.swap.swapCreated}`, { state: 'visible' })
  await page.waitForSelector(`text=${tr.wallet.recentActivity}`, { state: 'visible' })
  await page.waitForSelector('text=BTC to RGT', { state: 'visible' })

  // phase 2: swap RGT to BTC
  await navigateToSwaps(page)

  // select RGT as asset to swap from
  await expect(page.getByText('Bitcoin')).toBeVisible()
  await expect(page.getByText('Regtest Asset')).toBeVisible()
  await page.getByTestId('swap-asset-row-rgt').click()

  // select BTC as asset to swap to
  page.locator('.swap-receive-card').first().click()
  await page.getByTestId('swap-asset-row-sats').click()

  // insert 1000 RGT to swap
  await page.locator('[aria-label="1"]').click()
  await expect(page.getByText(tr.swap.amountTooSmall)).toBeVisible()
  await page.locator('[aria-label="0"]').click()
  await expect(page.getByText(tr.swap.amountTooSmall)).toBeVisible()
  await page.locator('[aria-label="0"]').click()
  await expect(page.getByText(tr.swap.amountTooSmall)).toBeVisible()
  await page.locator('[aria-label="0"]').click()
  await expect(page.getByText(tr.swap.amountTooSmall)).not.toBeVisible()

  await page.getByText(tr.common.continue).click()

  await page.getByText(tr.swap.confirmSwap).click()

  await page.waitForSelector(`text=${tr.swap.swapCreated}`, { state: 'visible' })
  await page.waitForSelector(`text=${tr.wallet.recentActivity}`, { state: 'visible' })
  await page.waitForSelector('text=RGT to BTC', { state: 'visible' })
})

test.skip('swap BTC <-> RGT using USD as currency', async ({ page }) => {
  await createWalletWithFiat(page)
  const usdsReceived = await fundWallet(page, 5000)
  expect(usdsReceived).toBeGreaterThan(1)

  // phase 1: swap BTC to RGT
  await navigateToSwaps(page)

  // select BTC as asset to swap from
  await expect(page.getByText('Bitcoin')).toBeVisible()
  await expect(page.getByText('Regtest Asset')).toBeVisible()
  await page.getByTestId('swap-asset-row-sats').click()

  // select RGT as asset to swap to
  page.locator('.swap-receive-card').first().click()
  await page.getByTestId('swap-asset-row-rgt').click()

  // insert 1 USD to swap
  await page.locator('[aria-label="1"]').click()
  await expect(page.getByText(tr.swap.amountTooSmall)).not.toBeVisible()

  await page.getByText(tr.common.continue).click()

  await page.getByText(tr.swap.confirmSwap).click()

  await page.waitForSelector(`text=${tr.swap.swapCreated}`, { state: 'visible' })
  await page.waitForSelector(`text=${tr.wallet.recentActivity}`, { state: 'visible' })
  await page.waitForSelector('text=BTC to RGT', { state: 'visible' })

  // phase 2: swap RGT to BTC
  await navigateToSwaps(page)

  // select RGT as asset to swap from
  await expect(page.getByText('Bitcoin')).toBeVisible()
  await expect(page.getByText('Regtest Asset')).toBeVisible()
  await page.getByTestId('swap-asset-row-rgt').click()

  // select BTC as asset to swap to
  await page.locator('.swap-receive-card').first().click()
  await page.getByTestId('swap-asset-row-sats').click()

  // insert 1000 RGT to swap
  await page.locator('[aria-label="1"]').click()
  await expect(page.getByText(tr.swap.amountTooSmall)).toBeVisible()
  await page.locator('[aria-label="0"]').click()
  await expect(page.getByText(tr.swap.amountTooSmall)).toBeVisible()
  await page.locator('[aria-label="0"]').click()
  await expect(page.getByText(tr.swap.amountTooSmall)).toBeVisible()
  await page.locator('[aria-label="0"]').click()
  await expect(page.getByText(tr.swap.amountTooSmall)).not.toBeVisible()

  await page.getByText(tr.common.continue).click()

  await page.getByText(tr.swap.confirmSwap).click()

  await page.waitForSelector(`text=${tr.swap.swapCreated}`, { state: 'visible' })
  await page.waitForSelector(`text=${tr.wallet.recentActivity}`, { state: 'visible' })
  await page.waitForSelector('text=RGT to BTC', { state: 'visible' })
})
