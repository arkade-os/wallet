import { test, expect, createWallet, readClipboard, handleKeyboardInput } from './utils'
import { decodeInvoice } from '../../lib/bolt11'
import { Page } from '@playwright/test'
import { decodeBip21, isBip21 } from '@/lib/bip21'
import { sleep } from '@/lib/sleep'

const createWalletAndGetBIP21 = async (page: Page): Promise<string> => {
  await createWallet(page)
  await page.getByTestId('tab-wallet').click()
  await page.getByText('Receive', { exact: true }).click()
  await sleep(1000) // wait for the receive page to load
  await page.getByText('Copy').click()
  await page.getByTestId('bip21-address-copy').click()
  const bip21 = await readClipboard(page)
  return bip21
}

test('should generate valid BIP21 out of the box', async ({ page }) => {
  // create wallet
  const bip21 = await createWalletAndGetBIP21(page)
  expect(isBip21(bip21)).toBe(true)
  const decoded = decodeBip21(bip21)

  expect(decoded.lnurl).toBeDefined()
  expect(decoded.address).toBeDefined()
  expect(decoded.arkAddress).toBeDefined()
  expect(decoded.invoice).toBeUndefined()
  expect(decoded.assetId).toBeUndefined()
  expect(decoded.satoshis).toBeUndefined()
  expect(decoded.assetAmount).toBeUndefined()
})

test('should have lnurl with no amount', async ({ page }) => {
  // create wallet
  const bip21 = await createWalletAndGetBIP21(page)
  expect(isBip21(bip21)).toBe(true)
  const decoded = decodeBip21(bip21)

  expect(decoded.lnurl).toBeDefined()
  expect(decoded.lnurl?.length).toBeGreaterThan(20)
  expect(decoded.lnurl?.toLowerCase()).toContain('lnurl')
})

test('should change from lnurl to bolt11 with amount', async ({ page, isMobile }) => {
  const sats = 2100
  // create wallet
  const bip21 = await createWalletAndGetBIP21(page)
  expect(isBip21(bip21)).toBe(true)
  const decoded = decodeBip21(bip21)

  expect(decoded.lnurl).toBeDefined()
  expect(decoded.invoice).toBeUndefined()

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

  const decodedInvoice = decodeInvoice(invoice)
  expect(decodedInvoice.amountSats).toBe(sats)
})
