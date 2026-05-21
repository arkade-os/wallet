import { test, expect, createWallet } from './utils'

test('should create a new wallet', async ({ page }) => {
  // Create wallet
  await createWallet(page)

  // Verify wallet main page
  await page.waitForSelector('text=SATS')
  await expect(page.getByText('0SATS')).toBeVisible()
  await expect(page.getByText('$0.00')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Receive' })).toBeVisible()
  await expect(page.getByText('No transactions yet')).not.toBeVisible()
  await expect(page.getByTestId('top-right-activity')).toBeVisible()
  await expect(page.getByTestId('top-right-settings')).toBeVisible()
  await expect(page.getByTestId('tab-wallet')).not.toBeVisible()
  await expect(page.getByTestId('tab-apps')).not.toBeVisible()
  await expect(page.getByTestId('tab-settings')).not.toBeVisible()
})
