import { test, expect } from '@playwright/test'
import { createWallet, navigateToAssets, mintAsset, fundWallet } from './utils'

test('should navigate to assets and see empty state', async ({ page }) => {
  await createWallet(page)
  await navigateToAssets(page)

  // assert empty state
  await expect(page.getByText('No assets yet. Import or mint one to get started.')).toBeVisible()
  await expect(page.getByText('Import', { exact: true })).toBeVisible()
  await expect(page.getByText('Mint', { exact: true })).toBeVisible()
})

test('should mint an asset and see it in list', async ({ page }) => {
  await createWallet(page)
  await fundWallet(page)
  await mintAsset(page, { amount: 1000, name: 'TestCoin', ticker: 'TST', decimals: 0 })

  // assert success screen
  await expect(page.getByText('TestCoin')).toBeVisible()
  await expect(page.getByText('TST')).toBeVisible()

  // go back to asset list
  await page.getByText('Back to Assets').click()
  await expect(page.getByText('TestCoin')).toBeVisible()
})

test('should view asset detail after minting', async ({ page }) => {
  await createWallet(page)
  await fundWallet(page)
  await mintAsset(page, { amount: 1000, name: 'TestCoin', ticker: 'TST', decimals: 0 })

  // view asset detail from success screen
  await page.getByText('View Asset').click()

  // assert detail page
  await expect(page.getByText('TestCoin').first()).toBeVisible()
  await expect(page.getByText('TST').first()).toBeVisible()
  await expect(page.getByText('Supply')).toBeVisible()
  await expect(page.getByText('Decimals')).toBeVisible()
  await expect(page.getByText('Send')).toBeVisible()
  await expect(page.getByText('Receive')).toBeVisible()
})

test('should burn part of an asset', async ({ page }) => {
  await createWallet(page)
  await fundWallet(page)
  await mintAsset(page, { amount: 1000, name: 'BurnCoin', ticker: 'BRN', decimals: 0 })

  // go to asset detail
  await page.getByText('View Asset').click()
  await expect(page.getByText('1,000 BRN')).toBeVisible()

  // click burn
  await page.getByText('Burn', { exact: true }).click()
  await page.waitForSelector('text=Amount to Burn', { state: 'visible' })

  // fill amount and submit
  await page.locator('input[type="number"]').fill('500')
  await page.getByText('Burn', { exact: true }).click()

  // confirm modal
  await page.waitForSelector('text=Confirm Burn', { state: 'visible' })
  await page.getByText('Burn', { exact: true }).first().click()

  // back on detail page with reduced balance
  await page.waitForSelector('text=BurnCoin', { state: 'visible' })
  await expect(page.getByText('500 BRN')).toBeVisible()
})

test('should reissue an asset with control token', async ({ page }) => {
  await createWallet(page)
  await fundWallet(page, 10000)

  // mint control token
  await mintAsset(page, { amount: 100, name: 'CtrlToken', ticker: 'CTL', decimals: 0 })
  await page.getByText('Back to Assets').click()

  // mint asset with control token
  await page.getByText('Mint', { exact: true }).click()
  await page.waitForSelector('text=Mint Asset', { state: 'visible' })
  await page.locator('input[placeholder="1000"]').fill('500')
  await page.locator('input[placeholder="My Token"]').fill('ReissueCoin')
  await page.locator('input[placeholder="TKN"]').fill('RSI')
  const decimalsInput = page.locator('input[placeholder="8"]')
  await decimalsInput.clear()
  await decimalsInput.fill('0')

  // select control asset from dropdown
  await page.getByText('Existing').click()
  await page.getByText('Select from wallet...').click()
  await page.getByText('CtrlToken (CTL)').click()

  // submit
  await page.getByText('Mint', { exact: true }).click()
  await page.waitForSelector('text=Asset minted!', { state: 'visible', timeout: 30000 })

  // go to asset detail
  await page.getByText('View Asset').click()
  await expect(page.getByText('500 RSI')).toBeVisible()

  // click reissue
  await page.getByText('Reissue', { exact: true }).click()
  await page.waitForSelector('text=Additional Amount', { state: 'visible' })

  // fill amount and submit
  await page.locator('input[type="number"]').fill('200')
  await page.getByText('Reissue', { exact: true }).click()

  // confirm modal
  await page.waitForSelector('text=Confirm Reissue', { state: 'visible' })
  await page.getByText('Reissue', { exact: true }).first().click()

  // back on detail page with increased balance
  await page.waitForSelector('text=ReissueCoin', { state: 'visible' })
  await expect(page.getByText('700 RSI')).toBeVisible()
})

test('should mint asset with new control asset', async ({ page }) => {
  await createWallet(page)
  await fundWallet(page, 10000)

  await mintAsset(page, {
    amount: 500,
    name: 'MyCoin',
    ticker: 'MYC',
    decimals: 0,
    controlMode: 'mint-new',
    ctrlAmount: 1,
    ctrlDecimals: 0,
  })

  // success screen shows main asset
  await expect(page.getByText('MyCoin')).toBeVisible()
  await expect(page.getByText('MYC')).toBeVisible()

  // view asset detail
  await page.getByText('View Asset').click()
  await expect(page.getByText('500 MYC')).toBeVisible()

  // control asset should be displayed
  await expect(page.getByText('ctrl-MyCoin')).toBeVisible()

  // reissue should be possible (we hold the control asset)
  await expect(page.getByText('Reissue', { exact: true })).toBeEnabled()
})
