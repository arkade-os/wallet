import {
  test,
  expect,
  createWallet,
  pay,
  receiveLightning,
  resetAndRestoreWallet,
  waitForPaymentReceived,
} from './utils'
import { exec } from 'child_process'
import { promisify } from 'util'
import { sleep } from '../../lib/sleep'

const execAsync = promisify(exec)

// Test to verify that settings are saved to nostr and restored correctly
// Since config persists across wallet resets, we need to add an extra step:
// 1. Enable nostr backups
// 2. Change a setting (fiat currency to euro)
// 3. Verify setting is euro
// 4. Disable nostr backups
// 5. Change setting (fiat currency to usd)
// 6. Verify setting is usd
// 7. Get nsec key
// 8. Reset wallet
// 9. Restore wallet with nsec key
// 10. Verify setting is euro (proving it was restored from nostr)
test.skip('should save config to nostr', async ({ page }) => {
  test.setTimeout(60000)
  // create wallet
  await createWallet(page)

  // enable nostr backups
  await page.getByTestId('tab-settings').click()
  await page.getByText('backup', { exact: true }).click()
  await page.getByText('Enable Nostr backups').click()

  // change fiat currency to euro
  await page.getByLabel('Go back').click()
  await page.getByText('general', { exact: true }).click()
  await expect(page.getByText('USD')).toBeVisible()
  await page.getByText('Fiat currency').click()
  await page.getByText('EUR').click()
  await page.waitForTimeout(500)

  // verify fiat currency is euro
  await page.getByLabel('Go back').click()
  await expect(page.getByText('EUR')).toBeVisible({ timeout: 2000 })

  // disable nostr backups
  await page.getByLabel('Go back').click()
  await page.getByText('backup', { exact: true }).click()
  await page.getByText('Enable Nostr backups').click()

  // change fiat currency to usd
  await page.getByLabel('Go back').click()
  await page.getByText('general', { exact: true }).click()
  await page.getByText('Fiat currency').click()
  await page.getByText('USD').click()

  // verify fiat currency is usd
  await page.getByLabel('Go back').click()
  await expect(page.getByText('USD')).toBeVisible()

  // restore wallet
  await resetAndRestoreWallet(page)

  // verify fiat currency is euro
  await page.getByTestId('tab-settings').click()
  await page.getByText('general', { exact: true }).click()
  await expect(page.getByText('EUR')).toBeVisible()
})

test.skip('should save swaps to nostr', async ({ page, isMobile }) => {
  test.setTimeout(60000)
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
  await page.getByTestId('tab-apps').click()
  await expect(page.getByText('Boltz', { exact: true })).toBeVisible()
  await page.getByTestId('app-boltz').click()
  await expect(page.getByText('+ 4,980 SATS', { exact: true })).toBeVisible()
  await page.getByLabel('Go back').click()

  // transaction should be visible on main page
  await page.getByTestId('tab-wallet').click()
  await page.waitForSelector('text=Received', { timeout: 10000 })
  await expect(page.getByText('4,980', { exact: true })).toBeVisible()

  /**
   * submarine swap
   */

  // generate lightning invoice to pay
  const { stdout } = await execAsync(`docker exec lnd lncli --network=regtest addinvoice --amt 1000`)
  const output = stdout.trim()
  expect(output).toBeDefined()
  expect(output).toBeTruthy()
  const outputJSON = JSON.parse(output)
  expect('payment_request' in outputJSON).toBeTruthy()
  const sendInvoice = outputJSON.payment_request
  expect(sendInvoice).toBeDefined()
  expect(sendInvoice).toBeTruthy()
  expect(sendInvoice).toContain('lnbcrt')

  // pay invoice
  await pay(page, sendInvoice, isMobile)

  // should be visible in Boltz app
  await page.getByTestId('tab-apps').click()
  await expect(page.getByText('Boltz', { exact: true })).toBeVisible()
  await page.getByTestId('app-boltz').click()
  await expect(page.getByText('- 1,001 SATS', { exact: true })).toBeVisible()
  await page.getByLabel('Go back').click()

  // transaction should be visible on main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('- 1,001 SATS')).toBeVisible()

  /**
   * chain swap
   */

  // send page
  const someOnchainAddress = 'bcrt1pxxxth5z4yn8nylc6nzz6w3vkumwdllaky5sls7an8e044u2qlnes2vvy6y'
  await pay(page, someOnchainAddress, isMobile, 2000)

  // should be visible in Boltz app
  await page.getByTestId('tab-apps').click()
  await expect(page.getByText('Boltz', { exact: true })).toBeVisible()
  await page.getByTestId('app-boltz').click()
  await expect(page.getByText('Arkade to Bitcoin', { exact: true })).toBeVisible()
  await page.getByLabel('Go back').click()

  // enable nostr backups
  await page.getByTestId('tab-settings').click()
  await page.getByText('backup', { exact: true }).click()
  await page.getByText('Enable Nostr backups').click()
  await sleep(2000) // wait for backup to complete

  // restore wallet
  await resetAndRestoreWallet(page)

  // should be visible in Boltz app
  await page.getByTestId('tab-apps').click()
  await expect(page.getByText('Boltz', { exact: true })).toBeVisible()
  await page.getByTestId('app-boltz').click()
  await expect(page.getByText('- 1,001 SATS', { exact: true })).toBeVisible()
  await expect(page.getByText('+ 4,980 SATS', { exact: true })).toBeVisible()
  await expect(page.getByText('Arkade to Bitcoin', { exact: true })).toBeVisible()
})
