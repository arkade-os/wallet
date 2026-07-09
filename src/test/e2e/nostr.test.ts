import {
  test,
  expect,
  createWallet,
  pay,
  receiveLightning,
  resetAndRestoreWallet,
  waitForPaymentReceived,
  navigateHome,
  navigateToBoltz,
  navigateToSettings,
  getInvoiceFromLND,
} from './utils'
import { exec } from 'child_process'
import { promisify } from 'util'
import { sleep } from '../../lib/sleep'

const execAsync = promisify(exec)

// Test to verify that settings are saved to nostr and restored correctly
// Since config persists across wallet resets, we need to add an extra step:
// 1. Enable nostr backups
// 2. Change a setting (currency to euro)
// 3. Verify setting is euro
// 4. Disable nostr backups
// 5. Change setting (currency to usd)
// 6. Verify setting is usd
// 7. Get nsec key
// 8. Reset wallet
// 9. Restore wallet with nsec key
// 10. Verify setting is euro (proving it was restored from nostr)
test('should save config to nostr', async ({ page }) => {
  test.setTimeout(180000)
  // create wallet
  await createWallet(page)

  // enable nostr backups
  await navigateToSettings(page)
  await page.getByText('backup', { exact: true }).click()
  await page.getByTestId('toggle-backup').click()

  // change currency to euro
  await page.getByLabel('Go back').click()
  await page.getByText('display', { exact: true }).click()
  await page.getByText('currency').click()
  await page.getByText('EUR').click()
  await page.waitForTimeout(500)

  // verify currency is euro
  await page.getByLabel('Go back').click()
  await expect(page.getByText('EUR')).toBeVisible({ timeout: 10000 })

  // disable nostr backups
  await page.getByLabel('Go back').click()
  await page.getByText('backup', { exact: true }).click()
  await page.getByTestId('toggle-backup').click()

  // change currency to usd
  await page.getByLabel('Go back').click()
  await page.getByText('display', { exact: true }).click()
  await page.getByText('currency').click()
  await page.getByText('USD').click()

  // verify currency is usd
  await page.getByLabel('Go back').click()
  await expect(page.getByText('USD')).toBeVisible()

  // restore wallet
  await resetAndRestoreWallet(page)

  // verify currency is euro (config is restored from nostr asynchronously after
  // the wallet reloads, so give it room)
  await navigateToSettings(page)
  await page.getByText('display', { exact: true }).click()
  await expect(page.getByText('EUR')).toBeVisible({ timeout: 30000 })
})

test('should save swaps to nostr', async ({ page, isMobile }) => {
  test.setTimeout(180000)
  // create wallet
  await createWallet(page)

  // copy invoice
  const receiveInvoice = await receiveLightning(page, isMobile, 5000)
  expect(receiveInvoice).toBeDefined()
  expect(receiveInvoice).toBeTruthy()
  expect(receiveInvoice).toContain('lnbcrt')

  // pay invoice with lnd
  await execAsync(`docker exec lnd lncli --network=regtest payinvoice ${receiveInvoice} --force`)

  // wait for payment received
  await waitForPaymentReceived(page)

  // should be visible in Boltz app
  await navigateToBoltz(page)
  await expect(page.getByText('+ 4,980 sats', { exact: true })).toBeVisible()
  await page.getByLabel('Go back').click()

  // transaction should be visible on main page
  await navigateHome(page)
  await page.waitForSelector('text=Received', { timeout: 10000 })
  await expect(page.getByText('+ 4,980 sats')).toBeVisible()

  /**
   * submarine swap
   */

  await sleep(3000)

  // generate lightning invoice to pay
  const sendInvoice = await getInvoiceFromLND(1000)
  expect(sendInvoice).toBeDefined()
  expect(sendInvoice).toBeTruthy()
  expect(sendInvoice).toContain('lnbcrt')

  // pay invoice
  await pay(page, sendInvoice, isMobile)

  // should be visible in Boltz app
  await navigateToBoltz(page)
  await expect(page.getByText('- 1,001 sats', { exact: true })).toBeVisible()
  await page.getByLabel('Go back').click()

  // transaction should be visible on main page
  await navigateHome(page)
  await page.waitForSelector('text=Sent', { timeout: 10000 })
  await expect(page.getByText('- 1,001 sats')).toBeVisible()

  /**
   * chain swap
   */

  await sleep(3000)

  // send page
  const someOnchainAddress = 'bcrt1pxxxth5z4yn8nylc6nzz6w3vkumwdllaky5sls7an8e044u2qlnes2vvy6y'
  await pay(page, someOnchainAddress, isMobile, 2000)

  // should be visible in Boltz app
  await navigateToBoltz(page)
  await expect(page.getByText('Arkade to Bitcoin', { exact: true })).toBeVisible()
  await page.getByLabel('Go back').click()

  // enable nostr backups
  await navigateToSettings(page)
  await page.getByText('backup', { exact: true }).click()
  await page.getByTestId('toggle-backup').click()
  await sleep(3000) // wait for backup to complete

  // restore wallet
  await resetAndRestoreWallet(page)
  await sleep(3000) // wait for restore to complete

  // should be visible in Boltz app
  await navigateToBoltz(page)
  await expect(page.getByText('- 1,001 sats', { exact: true })).toBeVisible()
  await expect(page.getByText('+ 4,980 sats', { exact: true })).toBeVisible()
  await expect(page.getByText('Arkade to Bitcoin', { exact: true })).toBeVisible()
})
