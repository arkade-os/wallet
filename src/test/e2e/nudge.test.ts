import { test, expect } from '@playwright/test'
import { exec } from 'child_process'
import { createWallet, receiveOnchain, waitForPaymentReceived } from './utils'

test('should add nudge when balance > 100_000 sats', async ({ page }) => {
  // create wallet
  await createWallet(page)

  // get onchain address
  const boardingAddress = await receiveOnchain(page)
  expect(boardingAddress).toBeDefined()
  expect(boardingAddress).toBeTruthy()

  // faucet
  exec(`nigiri faucet ${boardingAddress} 0.00100000`)

  // wait for payment received
  await waitForPaymentReceived(page)

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
