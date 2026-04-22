import {
  test,
  expect,
  createWallet,
  receiveOffchain,
  receiveOnchain,
  waitForPaymentReceived,
  handleKeyboardInput,
  readClipboard,
} from './utils'
import { exec } from 'child_process'
import { faucetOffchain } from './fundedWallet'
import { sleep } from '../../lib/sleep'

test('should receive onchain funds', async ({ page }) => {
  test.setTimeout(60000)
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

test('changing amount should update the invoice', async ({ page, isMobile }) => {
  const sats = 2000

  // create wallet
  await createWallet(page)

  // go to receive page
  await page.getByTestId('tab-wallet').click()
  await page.getByText('Receive', { exact: true }).click()

  // fill amount to receive if provided
  await page.getByText('Add amount').click()
  if (isMobile) {
    await page.locator('input[name="receive-amount-sheet"]').click()
    await handleKeyboardInput(page, sats)
  } else {
    await page.locator('input[name="receive-amount-sheet"]').fill(sats.toString())
    await page.getByText('Set amount').click()
  }

  // copy invoice
  await page.getByText('Copy').click()
  await page.getByTestId('invoice-address-copy').click()
  const invoice = await readClipboard(page)
  await sleep(1000)

  expect(invoice).toBeDefined()
  expect(invoice).toBeTruthy()
  expect(invoice).toContain('lnbcrt')

  // change amount to receive
  const newSats = 3000

  await page.getByText('Edit amount').click()
  if (isMobile) {
    await page.locator('input[name="receive-amount-sheet"]').click()
    // delete previous amount
    for (let i = 0; i < sats.toString().length + 1; i++) {
      await page.getByTestId('keyboard-x').click()
    }
    await handleKeyboardInput(page, newSats)
  } else {
    await page.locator('input[name="receive-amount-sheet"]').fill(newSats.toString())
    await page.getByText('Set amount').click()
  }

  // copy invoice
  await page.getByText('Copy').click()
  await page.getByTestId('invoice-address-copy').click()
  const newInvoice = await readClipboard(page)

  expect(newInvoice).toBeDefined()
  expect(newInvoice).toBeTruthy()
  expect(newInvoice).toContain('lnbcrt')

  // invoices should be different
  expect(invoice).not.toEqual(newInvoice)
})

test('receive without amount should not create swaps', async ({ page }) => {
  // create wallet
  await createWallet(page)

  // get offchain address
  const arkAddress = await receiveOffchain(page)
  expect(arkAddress).toBeDefined()
  expect(arkAddress).toBeTruthy()

  await faucetOffchain(arkAddress, 1000)
  await waitForPaymentReceived(page)

  // check that no swap was created
  await page.getByTestId('tab-apps').click()
  await page.getByTestId('app-boltz').click()
  await expect(page.getByTestId('empty-template')).toBeVisible()
})
