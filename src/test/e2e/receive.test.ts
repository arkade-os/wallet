import {
  test,
  expect,
  createWallet,
  receiveOffchain,
  receiveOnchain,
  waitForPaymentReceived,
  handleKeyboardInput,
  readClipboard,
  createWalletWithFiat,
  navigateHome,
  navigateToBoltz,
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
  await page.waitForSelector('text=+ 10,000 sats', { timeout: 10000 })
})

test('changing amount should update the invoice (sats mode)', async ({ page, isMobile }) => {
  const sats = 2000

  // create wallet
  await createWallet(page)

  // go to receive page
  await navigateHome(page)
  await page.getByText('Receive', { exact: true }).click()

  // fill amount to receive if provided
  await page.getByText('Add amount').click()
  if (isMobile) {
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

test('changing amount should update the invoice (fiat mode)', async ({ page, isMobile }) => {
  const usds = 2

  // create wallet
  await createWalletWithFiat(page)

  // go to receive page
  await navigateHome(page)
  await page.getByText('Receive', { exact: true }).click()

  // fill amount to receive if provided
  await page.getByText('Add amount').click()
  if (isMobile) {
    await handleKeyboardInput(page, usds)
  } else {
    await page.locator('input[name="receive-amount-sheet"]').fill(usds.toString())
    await page.getByText('Set amount').click()
  }

  // copy invoice
  await sleep(1000)
  await page.getByText('Copy').click()
  await page.getByTestId('invoice-address-copy').click()
  const invoice = await readClipboard(page)

  expect(invoice).toBeDefined()
  expect(invoice).toBeTruthy()
  expect(invoice).toContain('lnbcrt')

  // change amount to receive
  const newUsds = 3

  await page.getByText('Edit amount').click()
  if (isMobile) {
    // delete previous amount
    for (let i = 0; i < usds.toString().length + 1; i++) {
      await page.getByTestId('keyboard-x').click()
    }
    await handleKeyboardInput(page, newUsds)
  } else {
    await page.locator('input[name="receive-amount-sheet"]').fill(newUsds.toString())
    await page.getByText('Set amount').click()
  }

  // copy invoice
  await sleep(1000)
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
  await navigateToBoltz(page)
  await expect(page.getByTestId('empty-template')).toBeVisible()
})
