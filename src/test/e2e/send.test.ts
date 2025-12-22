import { test, expect } from '@playwright/test'
import { exec } from 'child_process'
import { readClipboard } from './utils'

test('should send offchain funds', async ({ page, isMobile }) => {
  await page.goto('/')
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Skip for now').click()
  await page.getByText('+ Create wallet').click()
  await page.getByText('Go to wallet').click()
  await page.getByText('Maybe later').click()

  // receive page
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
  await expect(page.getByText('SATS received successfully')).toBeVisible()
  await page.getByTestId('tab-wallet').click()

  // main page
  await expect(page.getByText('5,000', { exact: true })).toBeVisible()
  await expect(page.getByText('+ 5,000 SATS')).toBeVisible()
  await page.getByText('Send').click()

  // send page
  await page
    .locator('ion-input[name="send-address"] input')
    .fill(
      'tark1qr340xg400jtxat9hdd0ungyu6s05zjtdf85uj9smyzxshf98ndah6u2nredqtn0cr4p4zqz53gsmhju4l9t7x47kzleesa9dprx7e56xhzlen',
    )

  await page.locator('ion-input[name="send-amount"] input').fill('2000')

  // if on mobile, fill the amount with the keyboard
  if (isMobile) {
    await page.waitForSelector('text=Save', { state: 'visible' })
    await page.getByTestId('keyboard-2').click()
    const btn0 = page.getByTestId('keyboard-0')
    await btn0.click()
    await btn0.click()
    await btn0.click()
    await page.getByText('Save').click()
  }
  await page.waitForSelector('text=Continue', { state: 'visible' })
  await page.getByText('Continue').click()
  await page.getByText('Tap to Sign').click()
  await page.waitForSelector('text=Payment sent!')
  await expect(page.getByText('SATS sent successfully')).toBeVisible()
  await page.getByTestId('tab-wallet').click()

  // main page
  await expect(page.getByText('3,000SATS')).toBeVisible()
  await expect(page.getByText('- 2,000 SATS')).toBeVisible()
  await expect(page.getByText('Sent')).toBeVisible()
})
