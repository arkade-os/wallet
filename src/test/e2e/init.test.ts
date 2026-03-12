import { test, expect, createWallet } from './utils'

test('should create a new wallet', async ({ page }) => {
  // Create wallet
  await createWallet(page)

  // Verify wallet main page
  await page.waitForSelector('text=My balance')
  await expect(page.getByText('0SATS')).toBeVisible()
  await expect(page.getByText('0USD')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Receive' })).toBeVisible()
  await expect(page.getByText('No transactions yet')).toBeVisible()
  await expect(page.getByText('Wallet')).toBeVisible()
  await expect(page.getByText('Apps')).toBeVisible()
  await expect(page.getByText('Settings')).toBeVisible()
})
