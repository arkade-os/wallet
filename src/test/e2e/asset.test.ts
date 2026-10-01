import { test, expect, createWallet, navigateToAssets, mintAsset, fundWallet, enableAssets } from './utils'
import { translations } from '../../lib/i18n'

const tr = translations.en

test('should navigate to assets and see disabled state', async ({ page }) => {
  await createWallet(page)
  await navigateToAssets(page)

  // assert empty state
  await expect(page.getByText(tr.mint.arkadeMintDisabled)).toBeVisible()
  await expect(page.getByText(tr.mint.import, { exact: true })).not.toBeVisible()
  await expect(page.getByText(tr.mint.mint, { exact: true })).not.toBeVisible()

  // go back
  await page.getByLabel('Go back').click()

  // enable assets and navigate again
  await enableAssets(page)
  await navigateToAssets(page)

  // assert empty state
  await expect(page.getByText(tr.common.noAssetsYet)).toBeVisible()
  await expect(page.getByText(tr.components.noAssetsSubtext)).toBeVisible()
  await expect(page.getByText(tr.mint.import, { exact: true })).toBeVisible()
  await expect(page.getByText(tr.mint.mint, { exact: true })).toBeVisible()
})

test('should mint an asset and it should appear on arkade mint', async ({ page }) => {
  await createWallet(page)
  await fundWallet(page)
  await enableAssets(page)
  await mintAsset(page, { amount: '1000', name: 'TestCoin', ticker: 'TST', decimals: 0 })

  // assert success screen
  await expect(page.getByText('TestCoin')).toBeVisible()
  await expect(page.getByText('TST')).toBeVisible()

  // go back to asset list
  await page.getByText(tr.mint.backToArkadeMint).click()

  // assert home page
  await page.waitForSelector('text=TestCoin', { state: 'visible' })
  await expect(page.getByText('TST').first()).toBeVisible()

  // click asset card to go to detail page
  await page.getByTestId(/^asset-row-TST-/).click()
  await page.waitForSelector('text=TestCoin', { state: 'visible' })
  await expect(page.getByText(tr.mint.assetIdTapToCopy).first()).toBeVisible()
})

test('should mint an asset and burn part of it', async ({ page }) => {
  await createWallet(page)
  await fundWallet(page)
  await enableAssets(page)
  await mintAsset(page, { amount: '1000', name: 'TestCoin', ticker: 'TST', decimals: 0 })

  // assert success screen
  await expect(page.getByText('TestCoin')).toBeVisible()
  await expect(page.getByText('TST')).toBeVisible()

  // go back to asset list
  await page.getByText(tr.mint.backToArkadeMint).click()
  await expect(page.getByText('TestCoin')).toBeVisible()

  // view asset detail from success screen
  await page.getByTestId(/^asset-row-TST-/).click()

  // assert detail page
  await expect(page.getByText('TestCoin').first()).toBeVisible()
  await expect(page.getByText('TST').first()).toBeVisible()
  await expect(page.getByText(tr.mint.supply)).toBeVisible()
  await expect(page.getByText(tr.mint.decimals)).toBeVisible()
  await expect(page.getByText(tr.mint.send)).toBeVisible()
  await expect(page.getByText(tr.mint.receive)).toBeVisible()

  // click burn
  await page.getByText(tr.mint.burn, { exact: true }).click()
  await page.waitForSelector(`text=${tr.mint.amountToBurn}`, { state: 'visible' })

  // fill amount and submit
  await page.locator('input[type="number"]').fill('500')
  await page.getByText(tr.mint.burn, { exact: true }).click()

  // confirm modal
  await page.waitForSelector(`text=${tr.mint.confirmBurn}`, { state: 'visible' })
  await page.getByText(tr.mint.burn, { exact: true }).first().click()

  // back on detail page with reduced balance
  await page.waitForSelector('text=TestCoin', { state: 'visible' })
  await page.waitForSelector('text=500 TST', { timeout: 10000 })
})

test('should mint asset with fractional supply and burn it all', async ({ page }) => {
  await createWallet(page)
  await fundWallet(page)
  await enableAssets(page)
  await mintAsset(page, { amount: '123.45', name: 'TestCoin', ticker: 'TST', decimals: 2 })

  // assert success screen
  await expect(page.getByText('TestCoin')).toBeVisible()
  await expect(page.getByText('TST')).toBeVisible()

  // go back to asset list
  await page.getByText(tr.mint.backToArkadeMint).click()
  await expect(page.getByText('TestCoin')).toBeVisible()

  // view asset detail from success screen
  await page.getByTestId(/^asset-row-TST-/).click()

  // assert detail page
  await expect(page.getByText('TestCoin').first()).toBeVisible()
  await expect(page.getByText('TST').first()).toBeVisible()
  await expect(page.getByText(tr.mint.supply)).toBeVisible()
  await expect(page.getByText(tr.mint.decimals)).toBeVisible()
  await expect(page.getByText(tr.mint.send)).toBeVisible()
  await expect(page.getByText(tr.mint.receive)).toBeVisible()

  // click burn
  await page.getByText(tr.mint.burn, { exact: true }).click()
  await page.waitForSelector(`text=${tr.mint.amountToBurn}`, { state: 'visible' })

  // fill amount and submit
  await page.getByTestId('burn-max-button').click()
  await page.getByText(tr.mint.burn, { exact: true }).click()

  // confirm modal
  await page.waitForSelector(`text=${tr.mint.confirmBurn}`, { state: 'visible' })
  await page.getByText(tr.mint.burn, { exact: true }).first().click()

  // back on detail page with reduced balance
  await page.waitForSelector('text=TestCoin', { state: 'visible' })
  await page.waitForSelector('text=0 TST', { timeout: 10000 })
})

test('should reissue an asset with control token', async ({ page }) => {
  await createWallet(page)
  await fundWallet(page)
  await enableAssets(page)

  // mint control token
  await mintAsset(page, { amount: '100', name: 'CtrlToken', ticker: 'CTL', decimals: 0 })
  await page.getByText(tr.mint.backToArkadeMint).click()

  // mint asset with control token
  await page.getByText(tr.mint.mint, { exact: true }).click()
  await page.waitForSelector(`text=${tr.mint.title}`, { state: 'visible' })
  await page.getByTestId('asset-amount').fill('500')
  await page.getByTestId('asset-name').fill('ReissueCoin')
  await page.getByTestId('asset-ticker').fill('RSI')
  const decimalsInput = page.getByTestId('asset-decimals')
  await decimalsInput.fill('0')

  // select control asset from dropdown
  await page.getByText(tr.mint.existing).click()
  await page.getByText(tr.mint.selectFromWallet).click()
  await page.getByText('CtrlToken (CTL)').click()

  // submit
  await page.getByText(tr.mint.mint, { exact: true }).click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })
  await page.waitForSelector(`text=${tr.mint.assetMinted}`, { timeout: 30000 })

  // go to asset detail
  await page.getByText(tr.mint.viewAsset).click()
  await page.waitForSelector('text=500 RSI', { timeout: 10000 })

  // click reissue
  await page.getByText(tr.mint.reissue, { exact: true }).click()
  await page.waitForSelector(`text=${tr.mint.additionalAmount}`, { state: 'visible' })

  // fill amount and submit
  await page.getByTestId('asset-amount').fill('200')
  await page.getByText(tr.mint.reissue, { exact: true }).click()

  // confirm modal
  await page.waitForSelector(`text=${tr.mint.confirmReissue}`, { state: 'visible' })
  await page.getByText(tr.mint.reissue, { exact: true }).first().click()

  // back on detail page with increased balance
  await page.waitForSelector('text=ReissueCoin', { state: 'visible' })
  await page.waitForSelector('text=700 RSI', { state: 'visible' })
})

test('should mint asset with new control asset', async ({ page }) => {
  await createWallet(page)
  await fundWallet(page)
  await enableAssets(page)

  await mintAsset(page, {
    amount: '500',
    name: 'MyCoin',
    ticker: 'MYC',
    decimals: 0,
    controlMode: 'mint-new',
    ctrlAmount: 1,
  })

  // success screen shows main asset
  await expect(page.getByText('MyCoin')).toBeVisible()
  await expect(page.getByText('500 MYC')).toBeVisible()

  // view asset detail
  await page.getByText(tr.mint.viewAsset).click()
  await page.waitForSelector('text=500 MYC', { timeout: 10000 })

  // control asset should be displayed
  await expect(page.getByText('ctrl-MyCoin')).toBeVisible()

  // reissue should be possible (we hold the control asset)
  await expect(page.getByText(tr.mint.reissue, { exact: true })).toBeEnabled()
})

test('should mint asset with huge supply', async ({ page }) => {
  await createWallet(page)
  await fundWallet(page)
  await enableAssets(page)

  await mintAsset(page, {
    amount: '9' + Number.MAX_SAFE_INTEGER.toString(),
    name: 'Huge Supply',
    ticker: 'HS',
    decimals: 1,
  })

  // success screen shows main asset
  await expect(page.getByText('Huge Supply')).toBeVisible()
  await expect(page.getByText('99,007T HS', { exact: true })).toBeVisible()

  // view asset detail
  await page.getByText(tr.mint.viewAsset).click()
  await page.waitForSelector('text=99,007,199,254,740,991 HS', { timeout: 10000 })
})
