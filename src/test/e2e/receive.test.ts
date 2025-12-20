import { test, expect } from '@playwright/test'
import { exec } from 'child_process'
import { readClipboard } from './utils'

test('should receive onchain funds', async ({ page }) => {
  await page.goto('/')
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Skip for now').click()
  await page.getByText('+ Create wallet').click()
  await page.getByText('Go to wallet').click()
  await page.getByText('Maybe later').click()
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
  exec(`nigiri faucet ${boardingAddress} 0.0001`)

  await page.waitForSelector('text=Payment received!')
  await expect(page.getByText('Payment received!')).toBeVisible()
  await expect(page.getByText('SATS received successfully')).toBeVisible()
})

test('should receive offchain funds', async ({ page }) => {
  await page.goto('/')
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Skip for now').click()
  await page.getByText('+ Create wallet').click()
  await page.getByText('Go to wallet').click()
  await page.getByText('Maybe later').click()
  await page.getByText('Receive').click()
  await page.getByText('Skip').click()
  await page
    .locator('div')
    .filter({ hasText: /^Copy address$/ })
    .nth(5)
    .click()
  await page.getByRole('img').nth(5).click()
  await page.waitForTimeout(500)

  const arkAddress = await readClipboard(page)
  expect(arkAddress).toBeDefined()
  expect(arkAddress).toBeTruthy()

  // faucet
  exec(`docker exec -t arkd ark send --to ${arkAddress} --amount 5000 --password secret`)

  await page.waitForSelector('text=Payment received!')
  await expect(page.getByText('Payment received!')).toBeVisible()
  await expect(page.getByText('SATS received successfully')).toBeVisible()
})
