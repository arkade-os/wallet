import { promisify } from 'util'
import { exec } from 'child_process'
import {
  test,
  expect,
  createWallet,
  pay,
  receiveLightning,
  resetAndRestoreWallet,
  waitForPaymentReceived,
} from './utils'

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
  test.setTimeout(120000)

  // Capture browser console for debugging chain swap failures
  const consoleLogs: string[] = []
  page.on('console', (msg) => {
    const text = msg.text()
    if (text.includes('swap') || text.includes('Swap') || text.includes('boltz') || text.includes('Boltz') ||
        text.includes('error') || text.includes('Error') || text.includes('chain') || text.includes('Chain') ||
        text.includes('arkToBtc') || text.includes('collaborative'))
      consoleLogs.push(`[${msg.type()}] ${text}`)
  })

  // create wallet
  await createWallet(page)

  /**
   * reverse swap
   */

  // define amount 5000 SATS
  const invoice = await receiveLightning(page, isMobile, 5000)
  expect(invoice).toBeDefined()
  expect(invoice).toBeTruthy()
  expect(invoice).toContain('lnbcrt')

  // pay invoice with lnd
  await execAsync(`docker exec lnd lncli --network=regtest payinvoice ${invoice} --force`)

  // wait for payment received
  await waitForPaymentReceived(page)

  // navigate to wallet tab and verify balance before proceeding
  await page.getByTestId('tab-wallet').click()
  await page.waitForSelector('text=Received', { timeout: 10000 })
  await expect(page.getByText('4,980', { exact: true })).toBeVisible()

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
   * chain swap
   */

  // send page
  const someOnchainAddress = 'bcrt1pxxxth5z4yn8nylc6nzz6w3vkumwdllaky5sls7an8e044u2qlnes2vvy6y'
  await pay(page, someOnchainAddress, isMobile, 2000)
  await page.waitForSelector('text=SATS sent successfully', { timeout: 10000 })
  await expect(page.getByText('SATS sent successfully')).toBeVisible()

  // Verify chain swap was created (not collaborative exit) by checking Boltz swap history
  await page.getByTestId('tab-apps').click()
  await expect(page.getByText('Boltz', { exact: true })).toBeVisible()
  await page.getByTestId('app-boltz').click()
  await expect(page.getByText('Boltz')).toBeVisible()

  // Dump console logs for debugging if chain swap wasn't created
  const chainSwapVisible = await page.getByText('Arkade to Bitcoin').isVisible({ timeout: 5000 }).catch(() => false)
  if (!chainSwapVisible) {
    console.log('=== Chain swap NOT found in Boltz history before restore ===')
    console.log('This means createArkToBtcSwap() failed and the wallet fell back to collaborative exit.')
    console.log(`Captured ${consoleLogs.length} relevant console messages:`)
    consoleLogs.forEach((log) => console.log(`  ${log}`))

    // Also check what IS visible in the swap history
    const pageContent = await page.locator('[class*="swap"], [class*="history"], ion-list, ion-content').first().textContent().catch(() => 'N/A')
    console.log(`Swap history content: ${pageContent?.substring(0, 500)}`)
  }

  expect(chainSwapVisible, 'Chain swap (Arkade to Bitcoin) should exist in Boltz history before restore. ' +
    `Console logs: ${consoleLogs.filter(l => l.includes('error') || l.includes('Error')).join(' | ')}`).toBe(true)

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

  // verify all swaps are present (swap recovery from Boltz API can take a moment)
  await expect(page.getByText('Boltz')).toBeVisible()
  await expect(page.getByText('+ 4,980')).toBeVisible({ timeout: 30000 })
  await expect(page.getByText('- 1,001')).toBeVisible({ timeout: 10000 })
  await expect(page.getByText('Arkade to Bitcoin')).toBeVisible({ timeout: 10000 })
  await expect(page.getByText('Arkade to Lightning')).toBeVisible()
  await expect(page.getByText('Lightning to Arkade')).toBeVisible()
})
