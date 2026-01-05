import { test, expect } from '@playwright/test'
import { exec } from 'child_process'
import { createWallet, receiveOffchain, receiveOnchain, waitForPaymentReceived } from './utils'

test('should receive onchain funds', async ({ page }) => {
  // create wallet
  await createWallet(page)

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
