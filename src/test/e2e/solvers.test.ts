import { test, expect, createWallet, navigateToSettings } from './utils'

const card = {
  version: 0,
  name: 'my-card',
  markets: [
    {
      pair: 'BTC/USDT',
      base_asset: { id: 'btc', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
      quote_asset: {
        id: 'a'.repeat(68),
        name: 'Tether',
        ticker: 'USDT',
        decimals: 8,
      },
      price_feed: 'https://example.com/price',
      price_feed_schema: { type: 'json', price_path: '/price' },
      price_decimals: 2,
      fee_bps: 1,
      min_base_amount: '1',
      max_base_amount: '100',
      min_quote_amount: '1',
      max_quote_amount: '100',
    },
  ],
}

test('should add and remove a solver card from settings', async ({ page }) => {
  test.setTimeout(10_000)
  await createWallet(page)

  await navigateToSettings(page)
  await page.getByText('advanced', { exact: true }).click()
  await page.getByText('solvers', { exact: true }).click()

  await expect(page.getByText('You have no solver cards stored in your wallet.')).toBeVisible()

  await page.getByRole('button', { name: '+ Add new' }).click()
  await page.locator('textarea').fill(JSON.stringify(card))
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByText('You have 1 solver card stored in your wallet.')).toBeVisible()
  await expect(page.getByText('my-card')).toBeVisible()

  await page.getByRole('button', { name: 'Remove' }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Remove' }).click()

  await expect(page.getByText('You have no solver cards stored in your wallet.')).toBeVisible()
})

test('should show an error when adding an invalid solver card', async ({ page }) => {
  test.setTimeout(10_000)
  await createWallet(page)

  await navigateToSettings(page)
  await page.getByText('advanced', { exact: true }).click()
  await page.getByText('solvers', { exact: true }).click()

  await expect(page.getByText('You have no solver cards stored in your wallet.')).toBeVisible()

  // remove the last character to make it invalid JSON
  await page.getByRole('button', { name: '+ Add new' }).click()
  await page.locator('textarea').fill(JSON.stringify(card).slice(0, -1))
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText(/invalid JSON:/)).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()

  // use a invalid version number
  await page.getByRole('button', { name: '+ Add new' }).click()
  await page.locator('textarea').fill(JSON.stringify({ ...card, version: 1 }))
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText(/invalid card:/)).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
})
