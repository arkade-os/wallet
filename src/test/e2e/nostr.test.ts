import { test, expect } from '@playwright/test'
import { createWallet, pay, receiveLightning, resetAndRestoreWallet, waitForPaymentReceived } from './utils'
import { exec } from 'child_process'
import { promisify } from 'util'

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
test('should save config to nostr', async ({ page }) => {
  // create wallet
  await createWallet(page)

  // enable nostr backups
  await page.getByTestId('tab-settings').click()
  await page.getByText('backup', { exact: true }).click()
  await page.getByText('Enable Nostr backups').click()

  // change fiat currency to euro
  await page.getByTestId('tab-settings').click()
  await page.getByText('general', { exact: true }).click()
  await expect(page.getByText('USD')).toBeVisible()
  await page.getByText('Fiat currency').click()
  await page.getByText('EUR').click()
  await page.waitForTimeout(500)

  // verify fiat currency is euro
  await page.getByTestId('tab-settings').click()
  await page.getByText('general', { exact: true }).click()
  await expect(page.getByText('EUR')).toBeVisible({ timeout: 2000 })

  // disable nostr backups
  await page.getByTestId('tab-settings').click()
  await page.getByText('backup', { exact: true }).click()
  await page.getByText('Enable Nostr backups').click()

  // change fiat currency to usd
  await page.getByTestId('tab-settings').click()
  await page.getByText('general', { exact: true }).click()
  await page.getByText('Fiat currency').click()
  await page.getByText('USD').click()

  // verify fiat currency is usd
  await page.getByTestId('tab-settings').click()
  await page.getByText('general', { exact: true }).click()
  await expect(page.getByText('USD')).toBeVisible()

  // restore wallet
  await resetAndRestoreWallet(page)

  // verify fiat currency is euro
  await page.getByTestId('tab-settings').click()
  await page.getByText('general', { exact: true }).click()
  await expect(page.getByText('EUR')).toBeVisible()
})

test('should save swaps to nostr', async ({ page, isMobile }) => {
  // create wallet
  await createWallet(page)

  // copy invoice
  const receiveInvoice = await receiveLightning(page, isMobile, 2000)
  expect(receiveInvoice).toBeDefined()
  expect(receiveInvoice).toBeTruthy()
  expect(receiveInvoice).toContain('lnbcrt')

  // pay invoice with lnd
  exec(`docker exec lnd lncli --network=regtest payinvoice ${receiveInvoice} --force`)

  // wait for payment received
  await waitForPaymentReceived(page)

  // should be visible in Boltz app
  await page.getByTestId('tab-apps').click()
  await expect(page.getByText('Boltz', { exact: true })).toBeVisible()
  await page.getByTestId('app-boltz').click()
  await expect(page.getByText('+ ₿1,992', { exact: true })).toBeVisible()

  // transaction should be visible on main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('+ ₿1,992')).toBeVisible()

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
  await expect(page.getByText('- ₿1,001', { exact: true })).toBeVisible()

  // transaction should be visible on main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('- ₿1,001')).toBeVisible()

  // enable nostr backups
  await page.getByTestId('tab-settings').click()
  await page.getByText('backup', { exact: true }).click()
  await page.getByText('Enable Nostr backups').click()

  // restore wallet
  await resetAndRestoreWallet(page)

  // should be visible in Boltz app
  await page.getByTestId('tab-apps').click()
  await expect(page.getByText('Boltz', { exact: true })).toBeVisible()
  await page.getByTestId('app-boltz').click()
  await expect(page.getByText('- ₿1,001', { exact: true })).toBeVisible()
  await expect(page.getByText('+ ₿1,992', { exact: true })).toBeVisible()
})
