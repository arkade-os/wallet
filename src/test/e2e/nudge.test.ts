import { test, expect } from '@playwright/test'
import { exec } from 'child_process'
import { readClipboard } from './utils'

test('should add nudge when balance > 100_000 sats', async ({ page }) => {
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
  await page.waitForSelector('text=Copy address')
  await page.getByText('Copy address').click()
  await page.getByTestId('address-line-btc').locator('svg').first().click()
  await page.waitForTimeout(500)
  const boardingAddress = await readClipboard(page)
  expect(boardingAddress).toBeDefined()
  expect(boardingAddress).toBeTruthy()

  // faucet
  exec(`nigiri faucet ${boardingAddress} 0.0021`)
  await page.waitForSelector('text=Payment received!')
  await expect(page.getByText('Payment received!')).toBeVisible()
  await expect(page.getByText('SATS received successfully')).toBeVisible()

  // check if settings icon shows nudge badge
  await page.getByTestId('tab-settings').click()
  await expect(page.getByTestId('settings-nudge-badge')).toBeVisible()

  // check nudge
  await page.getByTestId('tab-settings').click()
  await expect(page.getByTestId('red-dot-icon')).toBeVisible()
  await page.getByText('Advanced').click()
  await expect(page.getByTestId('red-dot-icon')).toBeVisible()
  await page.getByText('Change password').click()
  await expect(page.getByText('You should set a password for your wallet.')).toBeVisible()
})
