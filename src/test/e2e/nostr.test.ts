import { test, expect } from '@playwright/test'
import { readClipboard } from './utils'
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
  // start
  await page.goto('/')

  // create new wallet
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Skip for now').click()
  await page.getByText('+ Create wallet').click()
  await page.getByText('Go to wallet').click()
  await page.getByText('Maybe later').click()

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
  await expect(page.getByText('EUR')).toBeVisible()

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

  // get nsec
  await page.getByTestId('tab-settings').click()
  await page.getByText('backup', { exact: true }).click()
  await page.getByText('View private key').click()
  await page.getByText('Confirm').click()
  const nsec = await page.getByTestId('private-key').innerText()
  expect(nsec.startsWith('nsec1')).toBe(true)

  // reset wallet
  await page.getByTestId('tab-settings').click()
  await page.getByText('Reset wallet').click()
  await page.getByText('I have backed up my wallet').click()
  await page.getByRole('contentinfo').getByText('Reset wallet').click()
  await page.waitForTimeout(1000)

  // restore wallet
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Skip for now').click()
  await page.getByText('Other login options').click()
  await page.getByText('Restore wallet').click()
  await page.locator('ion-input[name="private-key"] input').fill(nsec)
  await page.getByText('Continue').click()
  await expect(page.getByText('Wallet restored successfully!')).toBeVisible()
  await page.getByText('Go to wallet').click()
  await page.getByText('Maybe later').click()
  await page.waitForTimeout(1000)

  // verify fiat currency is euro
  await page.getByTestId('tab-settings').click()
  await page.getByText('general', { exact: true }).click()
  await expect(page.getByText('EUR')).toBeVisible()
})

test('should save swaps to nostr', async ({ page, isMobile }) => {
  // create wallet
  await page.goto('/')
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Skip for now').click()
  await page.getByText('+ Create wallet').click()
  await page.getByText('Go to wallet').click()
  await page.getByText('Maybe later').click()

  // receive page
  await page.getByTestId('tab-wallet').click()
  await page.getByText('Receive').click()
  await page.locator('ion-input[name="receive-amount"] input').click()
  if (isMobile) {
    await page.waitForSelector('text=Save', { state: 'visible' })
    await page.getByTestId('keyboard-2').click()
    const btn0 = page.getByTestId('keyboard-0')
    await btn0.click()
    await btn0.click()
    await btn0.click()
    await page.getByText('Save').click()
  } else {
    await page.locator('ion-input[name="receive-amount"] input').fill('2000')
  }
  await page.getByText('Continue').click()

  // copy invoice
  await page.getByText('Copy address').click()
  await expect(page.getByText('Lightning invoice')).toBeVisible()
  await page.getByTestId('invoice-address-copy').click() // copy invoice to clipboard
  const receiveInvoice = await readClipboard(page)
  expect(receiveInvoice).toBeDefined()
  expect(receiveInvoice).toBeTruthy()
  expect(receiveInvoice).toContain('lnbcrt')

  // pay invoice with lnd
  exec(`docker exec lnd lncli --network=regtest payinvoice ${receiveInvoice} --force`)

  // wait for payment received
  await page.waitForSelector('text=Payment received!')
  await expect(page.getByText('SATS received successfully')).toBeVisible()

  // should be visible in Boltz app
  await page.getByTestId('tab-apps').click()
  await expect(page.getByText('Boltz', { exact: true })).toBeVisible()
  await page.getByTestId('app-boltz').click()
  await expect(page.getByText('+ 1,992 SATS', { exact: true })).toBeVisible()

  // transaction should be visible on main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('+ 1,992 SATS')).toBeVisible()

  // generate lightning invoice to pay
  const { stdout } = await execAsync(`docker exec lnd lncli --network=regtest addinvoice --amt 1000`)
  const output = stdout.trim()
  expect(output).toBeDefined()
  expect(output).toBeTruthy()
  const outputJSON = JSON.parse(output)
  expect('payment_request' in outputJSON).toBeTruthy()
  const invoice = outputJSON.payment_request
  expect(invoice).toBeDefined()
  expect(invoice).toBeTruthy()
  expect(invoice).toContain('lnbcrt')

  // pay invoice
  await page.getByText('Send').click()
  await page.getByLabel('', { exact: true }).fill(invoice)
  await page.getByText('Continue').click()
  await page.getByText('Tap to Sign').click()
  await page.waitForSelector('text=Payment sent!')
  await expect(page.getByText('SATS sent successfully')).toBeVisible()
  await page.getByTestId('tab-wallet').click()

  // should be visible in Boltz app
  await page.getByTestId('tab-apps').click()
  await expect(page.getByText('Boltz', { exact: true })).toBeVisible()
  await page.getByTestId('app-boltz').click()
  await expect(page.getByText('- 1,001 SATS', { exact: true })).toBeVisible()

  // transaction should be visible on main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('- 1,001 SATS')).toBeVisible()

  // enable nostr backups
  await page.getByTestId('tab-settings').click()
  await page.getByText('backup', { exact: true }).click()
  await page.getByText('Enable Nostr backups').click()

  // get nsec
  await page.getByTestId('tab-settings').click()
  await page.getByText('backup', { exact: true }).click()
  await page.getByText('View private key').click()
  await page.getByText('Confirm').click()
  const nsec = await page.getByTestId('private-key').innerText()
  expect(nsec.startsWith('nsec1')).toBe(true)

  // reset wallet
  await page.getByTestId('tab-settings').click()
  await page.getByText('Reset wallet').click()
  await page.getByText('I have backed up my wallet').click()
  await page.getByRole('contentinfo').getByText('Reset wallet').click()
  await page.waitForTimeout(1000)

  // restore wallet
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Skip for now').click()
  await page.getByText('Other login options').click()
  await page.getByText('Restore wallet').click()
  await page.locator('ion-input[name="private-key"] input').fill(nsec)
  await page.getByText('Continue').click()
  await expect(page.getByText('Wallet restored successfully!')).toBeVisible()
  await page.getByText('Go to wallet').click()
  await page.getByText('Maybe later').click()

  // should be visible in Boltz app
  await page.getByTestId('tab-apps').click()
  await expect(page.getByText('Boltz', { exact: true })).toBeVisible()
  await page.getByTestId('app-boltz').click()
  await expect(page.getByText('- 1,001 SATS', { exact: true })).toBeVisible()
  await expect(page.getByText('+ 1,992 SATS', { exact: true })).toBeVisible()
})
