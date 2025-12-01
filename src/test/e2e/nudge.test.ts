import { test, expect } from '@playwright/test'
import { exec } from 'child_process'
import { readClipboard } from './utils'

test.skip('should add nudge when balance > 100_000 sats', async ({ page }) => {
  // create wallet
  await page.goto('/')
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Skip for now').click()
  await page.getByText('+ Create wallet').click()
  await page.getByText('Go to wallet').click()

  // get boarding address
  await page.getByText('Receive').click()
  await page.getByText('Skip').click()
  await page
    .locator('div')
    .filter({ hasText: /^Copy address$/ })
    .nth(5)
    .click()
  await page.getByRole('img').nth(4).click()
  await page.waitForTimeout(500)
  const boardingAddress = await readClipboard(page)
  expect(boardingAddress).toBeDefined()
  expect(boardingAddress).toBeTruthy()

  // faucet
  exec(`nigiri faucet ${boardingAddress} 0.0021`)
  await page.waitForSelector('text=Payment received!')
  await expect(page.getByText('Payment received!')).toBeVisible()
  await expect(page.getByText('SATS received successfully')).toBeVisible()

  // settle transaction
  await page.getByText('Wallet').click()
  await page.getByTestId('transactions-list').locator('div').first().click()
  await page.getByText('Complete boarding').click()
  await expect(page.getByText('Success')).toBeVisible()
  await expect(page.getByText('Transaction settled successfully')).toBeVisible()
})
