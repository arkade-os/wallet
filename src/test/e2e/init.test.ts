import { test, expect } from '@playwright/test'

test('should create a new wallet', async ({ page }) => {
  await page.goto('/')
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Skip for now').click()
  await page.getByText('+ Create wallet').click()
  await expect(page.getByText('Your new wallet is live!')).toBeVisible()
  await page.getByText('Go to wallet').click()
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

// TODO restore wallet test
