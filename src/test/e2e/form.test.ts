import { decodeBip21, encodeBip21 } from '../../lib/bip21'
import { sleep } from '../../lib/sleep'
import {
  test,
  expect,
  prePay,
  fundWallet,
  resetWallet,
  createWallet,
  getInvoiceFromLND,
  createWalletAndGetBIP21,
  handleKeyboardInput,
} from './utils'

const someArkAddress =
  'tark1qr340xg400jtxat9hdd0ungyu6s05zjtdf85uj9smyzxshf98nda' +
  'h6u2nredqtn0cr4p4zqz53gsmhju4l9t7x47kzleesa9dprx7e56xhzlen'

const someOnchainAddress = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'

const someLnUrl =
  'LNURL1DP68GUP69UHKCMMRV9KXSMMNWSARJVPEXQHKCMN4WFKZ7D3JXY6NGWFEVYMN2D3JX33KZVF5VD3RJDEK8P3KXEFJVYMNXVNXSG08CU'

const someInvoice =
  'lnbcrt21u1p5tqtaypp56yzglgfgwsm5pd49996jqvtmpf8fqdk7cq2znnjw5c2j5t8ua38q' +
  'dql2djkuepqw3hjqs2jfvsxzerywfjhxuccqz95xqztfsp586s5vpsdxt05rm7hr6ycwq5ff' +
  'mnx2gngv820seugky6j6z2wxqwq9qxpqysgqepuxr82pvlp8lgj7nqu8yp2f5q32323jxddx' +
  '9qgtjhfhsyzvftgkwx8qv4772fzz46pwyw5ex3u7lf7na8a8403ur3gyeu22gv29rpspefzz2y'

test('should prioritize Arkade addresses over others', async ({ page, isMobile }) => {
  // create wallet
  await createWallet(page)
  await fundWallet(page, 5000)

  const bip21 = encodeBip21(someOnchainAddress, someArkAddress, someInvoice, 0, someLnUrl)

  // send page
  await prePay(page, bip21, isMobile, 2000)

  // details page
  await expect(page.getByTestId('Direction')).toContainText('Paying inside Arkade')
  await expect(page.getByTestId('Network fees')).toContainText('0 sats')
  await expect(page.getByTestId('Amount')).toContainText('2,000 sats')
  await expect(page.getByTestId('Total')).toContainText('2,000 sats')
})

test('should prioritize lightning invoice if no ark address present', async ({ page }) => {
  // create wallet
  await createWallet(page)
  await fundWallet(page, 5000)

  // get invoice
  const invoice = await getInvoiceFromLND(2100)
  const bip21 = encodeBip21(someOnchainAddress, '', invoice, 2100, someLnUrl)

  // send page
  await prePay(page, bip21)

  // details page
  await expect(page.getByTestId('Direction')).toContainText('Swapping to Lightning')
  await expect(page.getByTestId('Network fees')).toContainText('1 sat')
  await expect(page.getByTestId('Amount')).toContainText('2,100 sats')
  await expect(page.getByTestId('Total')).toContainText('2,101 sats')
})

test('should prioritize lnurl if no invoice or ark address are present', async ({ page, isMobile }) => {
  const bip21 = await createWalletAndGetBIP21(page)
  const { lnUrl } = decodeBip21(bip21)
  expect(lnUrl).toBeDefined()
  const bip21WithLnUrl = encodeBip21(someOnchainAddress, '', '', 0, lnUrl)

  await resetWallet(page)
  await sleep(1000)

  // create wallet
  await createWallet(page)
  await fundWallet(page, 5000)

  // send page
  // go to send page
  await page.getByTestId('tab-wallet').click()
  await page.getByText('Send').click()

  // fill address
  await page.locator('input[name="send-address"]').fill(bip21WithLnUrl)

  // fill amount
  if (isMobile) {
    await page.locator('input[name="send-amount"]').click()
    await handleKeyboardInput(page, 2100)
  } else {
    await page.locator('input[name="send-amount"]').fill('2100')
  }

  // lnurl error because the wallet that used this lnurl is no longer running
  await expect(page.getByTestId('error-message')).toContainText('This LNURL is no longer active')
})
