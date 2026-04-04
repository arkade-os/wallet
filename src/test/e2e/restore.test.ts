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

  // Capture ALL browser console messages for debugging
  const consoleLogs: string[] = []
  page.on('console', (msg) => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`)
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

  // Verify chain swap was created by waiting for Boltz history to show it
  await page.getByTestId('tab-apps').click()
  await expect(page.getByText('Boltz', { exact: true })).toBeVisible()
  await page.getByTestId('app-boltz').click()
  await expect(page.getByText('Arkade to Bitcoin')).toBeVisible({ timeout: 15000 })

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

  // Debug: dump post-restore Boltz page content if chain swap is missing
  const chainSwapRestored = await page.getByText('Arkade to Bitcoin').isVisible().catch(() => false)
  if (!chainSwapRestored) {
    // Wait a bit more and check again — restoreSwaps may be slow
    await page.waitForTimeout(5000)
    const content = await page.locator('ion-content').first().textContent().catch(() => 'N/A')
    console.log('=== Post-restore Boltz page (after extra 5s wait) ===')
    console.log(`Content: ${content?.substring(0, 500)}`)

    // Check if restoreSwaps logged any errors
    const restoreErrors = consoleLogs.filter(l => l.toLowerCase().includes('restore') || l.toLowerCase().includes('chain'))
    console.log(`Restore-related console logs (${restoreErrors.length}):`)
    restoreErrors.forEach((log) => console.log(`  ${log}`))

    // Dump ALL console logs for comprehensive debugging
    console.log(`ALL captured console logs (${consoleLogs.length}):`)
    consoleLogs.slice(-30).forEach((log) => console.log(`  ${log}`))

    // Call Boltz restore API directly to check what it returns
    const restoreApiResult = await page.evaluate(async () => {
      try {
        // Get the compressed public key from the wallet
        const configRaw = localStorage.getItem('config')
        const boltzUrl = 'http://localhost:9069'
        // We can't easily get the public key from here, so let's check the IndexedDB state
        const dbs = await indexedDB.databases()
        return { databases: dbs.map(d => d.name), boltzUrl }
      } catch (e) {
        return { error: String(e) }
      }
    })
    console.log(`IndexedDB state: ${JSON.stringify(restoreApiResult)}`)
  }

  await expect(page.getByText('Arkade to Bitcoin')).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Arkade to Lightning')).toBeVisible()
  await expect(page.getByText('Lightning to Arkade')).toBeVisible()
})
