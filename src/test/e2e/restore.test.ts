import { promisify } from 'util'
import { exec } from 'child_process'
import { createWallet, pay, receiveLightning, resetAndRestoreWallet, waitForPaymentReceived } from './utils'
import { test, expect } from '@playwright/test'

const execAsync = promisify(exec)

// Test to verify that a restored wallet (without Nostr backup) has the correct:
// 1. transaction history
// 2. swap history
//
// Steps:
// 1. Create new wallet
// 2. Perform a reverse swap
// 3. Perform a submarine swap
// 4. Get backup phrase
// 5. Reset wallet
// 6. Restore wallet with backup phrase
// 7. Verify swap history has both swaps

test('should restore swaps without nostr backup', async ({ page, isMobile }) => {
  // create wallet
  await createWallet(page)

  /**
   * reverse swap
   */

  // define amount 2000 SATS
  const invoice = await receiveLightning(page, isMobile, 2000)
  expect(invoice).toBeDefined()
  expect(invoice).toBeTruthy()
  expect(invoice).toContain('lnbcrt')

  // pay invoice with lnd
  exec(`docker exec lnd lncli --network=regtest payinvoice ${invoice} --force`)

  // wait for payment received
  await waitForPaymentReceived(page)

  /**
   * submarine swap
   */

  // create invoice with lnd
  const { stdout } = await execAsync(`docker exec lnd lncli --network=regtest addinvoice --amt 1000`)
  const output = stdout.trim()
  expect(output).toBeDefined()
  expect(output).toBeTruthy()
  const outputJSON = JSON.parse(output)
  expect('payment_request' in outputJSON).toBeTruthy()
  const paymentRequest = outputJSON.payment_request
  expect(paymentRequest).toBeDefined()
  expect(paymentRequest).toBeTruthy()
  expect(paymentRequest).toContain('lnbcrt')

  // go to send page and pay invoice
  await pay(page, paymentRequest, isMobile)

  /**
   * restore wallet
   */

  // restore wallet with nsec
  await resetAndRestoreWallet(page)

  /**
   * verify swap history
   */

  // go to Boltz app
  await page.getByTestId('tab-apps').click()
  await expect(page.getByText('Boltz', { exact: true })).toBeVisible()
  await page.getByTestId('app-boltz').click()

  // verify both swaps are present
  await expect(page.getByText('Boltz')).toBeVisible()
  await expect(page.getByText('+ 1,992')).toBeVisible()
  await expect(page.getByText('Lightning to Arkade')).toBeVisible()
  await expect(page.getByText('- 1,001')).toBeVisible()
  await expect(page.getByText('Arkade to Lightning')).toBeVisible()
})
