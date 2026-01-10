import { test, expect } from '@playwright/test'
import { exec } from 'child_process'
import {
  createWallet,
  receiveOffchain,
  receiveOnchain,
  resetAndRestoreReadonlyWallet,
  waitForPaymentReceived,
} from './utils'

test('should receive onchain funds', async ({ page }) => {
  // create wallet
  await createWallet(page)

  await resetAndRestoreReadonlyWallet(page)

  // get onchain address
  const boardingAddress = await receiveOnchain(page)
  expect(boardingAddress).toBeDefined()
  expect(boardingAddress).toBeTruthy()

  // faucet
  exec(`nigiri faucet ${boardingAddress} 0.0001`)

  // wait for payment received
  await waitForPaymentReceived(page)
})

test('should receive offchain funds', async ({ page }) => {
  // create wallet
  await createWallet(page)
  await resetAndRestoreReadonlyWallet(page)

  // get offchain address
  const arkAddress = await receiveOffchain(page)
  expect(arkAddress).toBeDefined()
  expect(arkAddress).toBeTruthy()

  // faucet
  exec(`docker exec -t arkd ark send --to ${arkAddress} --amount 5000 --password secret`)

  // wait for payment received
  await waitForPaymentReceived(page)
  await expect(page.getByText('SATS received successfully')).toBeVisible()
})

test('should hide Send button, Apps tab, and designated Setting options', async ({ page }) => {
  // create wallet
  await createWallet(page)
  await resetAndRestoreReadonlyWallet(page)

  await expect(page.getByText('This wallet is read-only.')).toBeVisible()
  await expect(page.getByText('Send', { exact: true })).not.toBeVisible()
  await expect(page.getByText('Apps')).not.toBeVisible()

  // Settings
  await page.getByTestId('tab-settings').click()
  await expect(page.getByText('This wallet is read-only.')).toBeVisible()
  await expect(page.getByText('Notes')).not.toBeVisible()
  await expect(page.getByText('Lock wallet')).not.toBeVisible()

  await page.getByText('Advanced').click()
  await expect(page.getByText('This wallet is read-only.')).toBeVisible()
  await expect(page.getByText('Change passowrd')).not.toBeVisible()
})
