import { test, expect, createWallet, readClipboard, waitForPaymentReceived } from './utils'
import { isValidLnUrl, checkLnUrlConditions, fetchInvoice } from '../../lib/lnurl'
import { decodeInvoice } from '../../lib/bolt11'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

test('should have lnurl with no amount', async ({ page }) => {
  // create wallet
  await createWallet(page)

  // go to receive page
  await page.getByTestId('tab-wallet').click()
  await page.getByText('Receive', { exact: true }).click()

  // copy lnurl
  await page.getByText('Copy').click()
  await page.getByTestId('lnurl-address-copy').click()
  const lnurl = await readClipboard(page)

  expect(lnurl).toContain('LNURL')
  expect(lnurl.length).toBeGreaterThan(100)
  expect(isValidLnUrl(lnurl)).toBe(true)
})

test('should check conditions from lnurl', async ({ page }) => {
  // create wallet
  await createWallet(page)

  // go to receive page
  await page.getByTestId('tab-wallet').click()
  await page.getByText('Receive', { exact: true }).click()

  // copy lnurl
  await page.getByText('Copy').click()
  await page.getByTestId('lnurl-address-copy').click()
  const lnurl = await readClipboard(page)

  expect(lnurl).toContain('LNURL')
  expect(lnurl.length).toBeGreaterThan(100)
  expect(isValidLnUrl(lnurl)).toBe(true)

  // check conditions
  const conditions = await checkLnUrlConditions(lnurl)
  expect(conditions).toHaveProperty('commentAllowed')
  expect(conditions).toHaveProperty('maxSendable')
  expect(conditions).toHaveProperty('minSendable')
  expect(conditions).toHaveProperty('callback')
  expect(conditions).toHaveProperty('metadata')
  expect(conditions).toHaveProperty('tag')
})

test('should fetch invoice from lnurl', async ({ page }) => {
  // create wallet
  await createWallet(page)

  // go to receive page
  await page.getByTestId('tab-wallet').click()
  await page.getByText('Receive', { exact: true }).click()

  // copy lnurl
  await page.getByText('Copy').click()
  await page.getByTestId('lnurl-address-copy').click()
  const lnurl = await readClipboard(page)

  expect(lnurl).toContain('LNURL')
  expect(lnurl.length).toBeGreaterThan(100)
  expect(isValidLnUrl(lnurl)).toBe(true)

  // fetch invoice
  const invoice = await fetchInvoice(lnurl, 2000, 'Test payment')
  expect(invoice).toContain('lnbcrt')

  // decode invoice
  const decoded = decodeInvoice(invoice)
  expect(decoded).toHaveProperty('paymentHash')
  expect(decoded).toHaveProperty('amountSats')
  expect(decoded).toHaveProperty('expiry')
  expect(decoded).toHaveProperty('note')
  expect(decoded.amountSats).toBe(2000)
})

test('should receive payment', async ({ page }) => {
  // create wallet
  await createWallet(page)

  // go to receive page
  await page.getByTestId('tab-wallet').click()
  await page.getByText('Receive', { exact: true }).click()

  // copy lnurl
  await page.getByText('Copy').click()
  await page.getByTestId('lnurl-address-copy').click()
  const lnurl = await readClipboard(page)

  expect(lnurl).toContain('LNURL')
  expect(lnurl.length).toBeGreaterThan(100)
  expect(isValidLnUrl(lnurl)).toBe(true)

  // fetch invoice
  const invoice = await fetchInvoice(lnurl, 2000, 'Test payment')
  expect(invoice).toContain('lnbcrt')

  // pay invoice with lnd
  await execAsync(`docker exec lnd lncli --network=regtest payinvoice ${invoice} --force`)

  // wait for payment received
  await waitForPaymentReceived(page)

  // transaction should be visible on main page
  await page.getByTestId('tab-wallet').click()
  await page.waitForSelector('text=Received', { timeout: 10000 })
  await expect(page.getByText('1,992', { exact: true })).toBeVisible()
})
