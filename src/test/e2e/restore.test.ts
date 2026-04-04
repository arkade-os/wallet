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

  /**
   * restore wallet
   */

  // Diagnostic: call Boltz restore API directly to see raw response
  const restoreDiag = await page.evaluate(async () => {
    try {
      // Get the wallet's compressed public key from IndexedDB arkade-swaps store
      const dbs = await indexedDB.databases()
      const dbNames = dbs.map((d: any) => d.name)

      // Find the public key by reading the arkade identity from localStorage
      const configRaw = localStorage.getItem('config')
      const config = configRaw ? JSON.parse(configRaw) : {}

      // Call Boltz restore with a dummy key first to check if the endpoint works
      const testResp = await fetch('http://localhost:9069/v2/swap/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: '000000000000000000000000000000000000000000000000000000000000000000' }),
      })
      const testData = await testResp.text()

      // Get the actual swap history from IndexedDB to find swap IDs
      const swapDb = await new Promise<any>((resolve, reject) => {
        const req = indexedDB.open('arkade-swaps')
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      const storeNames = Array.from(swapDb.objectStoreNames) as string[]
      const allSwaps: any[] = []
      for (const storeName of storeNames) {
        const tx = swapDb.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const items = await new Promise<any[]>((resolve, reject) => {
          const req = store.getAll()
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })
        allSwaps.push({
          store: storeName,
          count: items.length,
          items: items.map((i: any) => ({
            id: i.id,
            type: i.type,
            request: i.request
              ? {
                  from: i.request.from,
                  to: i.request.to,
                  refundPublicKey: i.request.refundPublicKey,
                  claimPublicKey: i.request.claimPublicKey,
                }
              : null,
          })),
        })
      }
      swapDb.close()

      return {
        dbNames,
        storeNames,
        allSwaps,
        testEndpoint: { status: testResp.status, body: testData.substring(0, 200) },
        config: { boltzApiUrl: config.boltzApiUrl },
      }
    } catch (e: any) {
      return { error: e.message, stack: e.stack }
    }
  })
  console.log('=== RESTORE DIAGNOSTIC ===')
  console.log(JSON.stringify(restoreDiag, null, 2))

  // If we found swap data with public keys, call restore with the actual key
  if (restoreDiag && !restoreDiag.error && restoreDiag.allSwaps) {
    for (const store of restoreDiag.allSwaps) {
      for (const item of store.items) {
        if (item.request?.refundPublicKey) {
          const resp = await page.evaluate(async (pubKey: string) => {
            const r = await fetch('http://localhost:9069/v2/swap/restore', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ publicKey: pubKey }),
            })
            const text = await r.text()
            return { status: r.status, body: text.substring(0, 2000) }
          }, item.request.refundPublicKey)
          console.log(`=== RESTORE WITH refundPublicKey from ${store.store}/${item.id} ===`)
          console.log(JSON.stringify(resp, null, 2))
          break
        }
        if (item.request?.claimPublicKey) {
          const resp = await page.evaluate(async (pubKey: string) => {
            const r = await fetch('http://localhost:9069/v2/swap/restore', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ publicKey: pubKey }),
            })
            const text = await r.text()
            return { status: r.status, body: text.substring(0, 2000) }
          }, item.request.claimPublicKey)
          console.log(`=== RESTORE WITH claimPublicKey from ${store.store}/${item.id} ===`)
          console.log(JSON.stringify(resp, null, 2))
          break
        }
      }
    }
  }

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
  await expect(page.getByText('Arkade to Bitcoin')).toBeVisible({ timeout: 10000 })
  await expect(page.getByText('Arkade to Lightning')).toBeVisible()
  await expect(page.getByText('- 1,001')).toBeVisible()
  await expect(page.getByText('Lightning to Arkade')).toBeVisible()
  await expect(page.getByText('+ 4,980')).toBeVisible()
})
