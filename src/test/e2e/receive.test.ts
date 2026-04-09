import { test, expect, createWallet, receiveOffchain, receiveOnchain, waitForPaymentReceived } from './utils'
import { exec } from 'child_process'
import { faucetOffchain } from './fundedWallet'

test('should receive onchain funds', async ({ page }) => {
  test.setTimeout(120000)
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
  await faucetOffchain(arkAddress, 10000)

  // wait for payment received
  await waitForPaymentReceived(page)
  await page.waitForSelector('text=+ 10,000 SATS', { timeout: 10000 })
})
