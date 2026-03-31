import {
  test,
  expect,
  createWallet,
  receiveOffchain,
  waitForPaymentReceived,
  fundWallet,
  prePay,
  getFeesFromDetails,
  enableAssets,
  mintAsset,
  handleKeyboardInput,
} from './utils'
import { execSync } from 'child_process'
import { faucetOffchain } from './fundedWallet'
import { prettyNumber } from '../../lib/format'

test('should send to ark address', async ({ page, isMobile }) => {
  // create wallet
  await createWallet(page)
  await fundWallet(page, 5000)

  // main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('5,000', { exact: true })).toBeVisible()
  await expect(page.getByText('+ 5,000 SATS')).toBeVisible()

  const someArkAddress =
    'tark1qr340xg400jtxat9hdd0ungyu6s05zjtdf85uj9smyzxshf98nda' +
    'h6u2nredqtn0cr4p4zqz53gsmhju4l9t7x47kzleesa9dprx7e56xhzlen'

  // send page
  await prePay(page, someArkAddress, isMobile, 2000)

  // details page
  await expect(page.getByTestId('Network fees')).toContainText('0 SATS')
  await expect(page.getByTestId('Amount')).toContainText('2,000 SATS')
  await expect(page.getByTestId('Total')).toContainText('2,000 SATS')

  // finalize payment
  await page.getByText('Tap to Sign').click()
  await page.waitForSelector('text=Payment sent!', { timeout: 60000 })
  await expect(page.getByText('2,000 SATS sent successfully')).toBeVisible()

  // main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('3,000SATS')).toBeVisible()
  await expect(page.getByText('- 2,000 SATS')).toBeVisible()
  await expect(page.getByText('Sent')).toBeVisible()
})

test('should send MAX to ark address', async ({ page }) => {
  // create wallet
  await createWallet(page)
  await fundWallet(page, 5000)

  // main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('5,000', { exact: true })).toBeVisible()
  await expect(page.getByText('+ 5,000 SATS')).toBeVisible()

  // send page
  const someArkAddress =
    'tark1qr340xg400jtxat9hdd0ungyu6s05zjtdf85uj9smyzxshf98nda' +
    'h6u2nredqtn0cr4p4zqz53gsmhju4l9t7x47kzleesa9dprx7e56xhzlen'

  // go to send page
  await page.getByTestId('tab-wallet').click()
  await page.getByText('Send').click()

  // fill address
  await page.locator('ion-input[name="send-address"] input').fill(someArkAddress)

  // click max
  await page.getByTestId('input-amount-max').click()

  // continue to details page
  await page.getByText('Continue').click()

  // details page
  await expect(page.getByTestId('Network fees')).toContainText('0 SATS')
  await expect(page.getByTestId('Amount')).toContainText('5,000 SATS')
  await expect(page.getByTestId('Total')).toContainText('5,000 SATS')

  await page.getByText('Tap to Sign').click()
  await page.waitForSelector('text=5,000 SATS sent successfully', { timeout: 10000 })

  // main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('- 5,000 SATS')).toBeVisible()
  await expect(page.getByText('Sent')).toBeVisible()
})

test('should send assets to ark address', async ({ page, isMobile }) => {
  // create wallet
  await createWallet(page)
  await fundWallet(page, 5000)
  await enableAssets(page)
  await mintAsset(page, { amount: 1000, name: 'TestCoin', ticker: 'TST', decimals: 0 })

  // assert success screen
  await expect(page.getByText('TestCoin')).toBeVisible()
  await expect(page.getByText('TST')).toBeVisible()

  // main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('5,000', { exact: true })).toBeVisible()
  await expect(page.getByText('+ 5,000 SATS')).toBeVisible()
  await page.waitForSelector('text=Issuance', { timeout: 10000 })

  // send page
  const someArkAddress =
    'tark1qr340xg400jtxat9hdd0ungyu6s05zjtdf85uj9smyzxshf98nda' +
    'h6u2nredqtn0cr4p4zqz53gsmhju4l9t7x47kzleesa9dprx7e56xhzlen'

  // go to send page
  await page.getByTestId('tab-wallet').click()
  await page.getByText('Send').click()

  // fill address
  await page.locator('ion-input[name="send-address"] input').fill(someArkAddress)

  // select asset
  await page.getByTestId('asset-selector').click()
  await page.getByTestId('asset-tst-option').click()

  // fill amount
  if (isMobile) {
    await page.locator('ion-input[name="send-amount"] input').click()
    await handleKeyboardInput(page, 200)
  } else {
    await page.locator('ion-input[name="send-amount"] input').fill('200')
  }

  // continue to details page
  await page.getByText('Continue').click()

  // details page
  await expect(page.getByTestId('send-details-asset-name')).toHaveText('TestCoin (TST)')
  await expect(page.getByTestId('send-details-asset-amount')).toHaveText('200 TST')
  await expect(page.getByTestId('Network fees')).toHaveText('0 SATS')
  await expect(page.getByTestId('Amount')).toHaveText('0 SATS')
  await expect(page.getByTestId('Total')).toHaveText('0 SATS')

  await page.getByText('Tap to Sign').click()
  await page.waitForSelector('text=200 TST sent successfully', { timeout: 10000 })

  // main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('- 330 SATS')).toBeVisible()
  await expect(page.getByText('Sent')).toBeVisible()
})

test('should send MAX assets to ark address', async ({ page }) => {
  // create wallet
  await createWallet(page)
  await fundWallet(page, 5000)
  await enableAssets(page)
  await mintAsset(page, { amount: 1000, name: 'TestCoin', ticker: 'TST', decimals: 0 })

  // assert success screen
  await expect(page.getByText('TestCoin')).toBeVisible()
  await expect(page.getByText('TST')).toBeVisible()

  // main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('5,000', { exact: true })).toBeVisible()
  await expect(page.getByText('+ 5,000 SATS')).toBeVisible()
  await page.waitForSelector('text=Issuance', { timeout: 10000 })

  // send page
  const someArkAddress =
    'tark1qr340xg400jtxat9hdd0ungyu6s05zjtdf85uj9smyzxshf98nda' +
    'h6u2nredqtn0cr4p4zqz53gsmhju4l9t7x47kzleesa9dprx7e56xhzlen'

  // go to send page
  await page.getByTestId('tab-wallet').click()
  await page.getByText('Send').click()

  // fill address
  await page.locator('ion-input[name="send-address"] input').fill(someArkAddress)

  // select asset
  await page.getByTestId('asset-selector').click()
  await page.getByTestId('asset-tst-option').click()

  // click max
  await page.getByTestId('input-amount-max').click()

  // continue to details page
  await page.getByText('Continue').click()

  // details page
  await expect(page.getByTestId('send-details-asset-name')).toHaveText('TestCoin (TST)')
  await expect(page.getByTestId('send-details-asset-amount')).toHaveText('1,000 TST')
  await expect(page.getByTestId('Network fees')).toHaveText('0 SATS')
  await expect(page.getByTestId('Amount')).toHaveText('0 SATS')
  await expect(page.getByTestId('Total')).toHaveText('0 SATS')

  await page.getByText('Tap to Sign').click()
  await page.waitForSelector('text=1,000 TST sent successfully', { timeout: 10000 })

  // main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('- 330 SATS')).toBeVisible()
  await expect(page.getByText('Sent')).toBeVisible()
})

// wallet balance is 5000 sats,
// wants to send 2000 sats onchain,
// wallet will deliver 2000 sats on final UTXO,
// which means user must pay more for chain swap fees
test('should send to onchain address with chain swap', async ({ page, isMobile }) => {
  // create wallet
  await createWallet(page)
  await fundWallet(page, 5000)

  // main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('5,000', { exact: true })).toBeVisible()
  await expect(page.getByText('+ 5,000 SATS')).toBeVisible()

  const someOnchainAddress = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'

  // send page
  await prePay(page, someOnchainAddress, isMobile, 2000)

  // details page
  const fees = await getFeesFromDetails(page)
  const total = prettyNumber(2000 + fees) + ' SATS'
  await expect(page.getByTestId('Network fees')).toContainText(prettyNumber(fees) + ' SATS')
  await expect(page.getByTestId('Amount')).toContainText('2,000 SATS')
  await expect(page.getByTestId('Total')).toContainText(total)

  await page.getByText('Tap to Sign').click()
  await page.waitForSelector(`text=${total} sent successfully`, { timeout: 10000 })

  // main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('Received')).toBeVisible()
  await expect(page.getByText('5,000 SATS')).toBeVisible()
  await expect(page.getByText('Sent')).toBeVisible()
  await expect(page.getByText(`- ${total}`)).toBeVisible()
})

// wallet balance is 5000 sats, wants to send 5000 sats onchain,
// since it's a max send, wallet will calculate the fees and deduct from the amount,
// so user will receive less than 5000 sats onchain, but it will be a successful send
test('should send MAX to onchain address with chain swap', async ({ page }) => {
  // create wallet
  await createWallet(page)
  await fundWallet(page, 5000)

  // main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('5,000', { exact: true })).toBeVisible()
  await expect(page.getByText('+ 5,000 SATS')).toBeVisible()

  // send page
  const someOnchainAddress = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'

  // go to send page
  await page.getByTestId('tab-wallet').click()
  await page.getByText('Send').click()

  // fill address
  await page.locator('ion-input[name="send-address"] input').fill(someOnchainAddress)

  // click max
  await page.getByTestId('input-amount-max').click()

  await page.waitForSelector('text=Fees will be deducted from the amount sent', { timeout: 2000 })

  // continue to send
  await page.getByText('Continue').click()

  // details page
  const fees = await getFeesFromDetails(page)
  const amount = prettyNumber(5000 - fees) + ' SATS'
  await expect(page.getByTestId('Amount')).toContainText(amount)
  await expect(page.getByTestId('Total')).toContainText('5,000 SATS')
  await expect(page.getByTestId('Network fees')).toContainText(prettyNumber(fees) + ' SATS')

  await page.getByText('Tap to Sign').click()
  await page.waitForSelector('text=5,000 SATS sent successfully', { timeout: 10000 })

  // main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('- 5,000 SATS')).toBeVisible()
  await expect(page.getByText('Sent')).toBeVisible()
})

// wallet balance is 5000 sats,
// wants to send 1000 sats onchain,
// wallet will deliver 1000 sats on final UTXO,
// which means user must pay more for output
// since 1000 sats is below the minimum for chain swap,
// wallet will use collaborative exit to send onchain
test('should send to onchain address with collaborative exit', async ({ page, isMobile }) => {
  // create wallet
  await createWallet(page)
  await fundWallet(page, 5000)

  // main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('5,000', { exact: true })).toBeVisible()
  await expect(page.getByText('+ 5,000 SATS')).toBeVisible()

  const someOnchainAddress = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'

  // send page
  await prePay(page, someOnchainAddress, isMobile, 1000)

  // details page
  const fees = await getFeesFromDetails(page)
  const total = prettyNumber(1000 + fees) + ' SATS'
  await expect(page.getByTestId('Network fees')).toContainText(prettyNumber(fees) + ' SATS')
  await expect(page.getByTestId('Amount')).toContainText('1,000 SATS')
  await expect(page.getByTestId('Total')).toContainText(total)

  await page.getByText('Tap to Sign').click()
  await page.waitForSelector(`text=${total} sent successfully`, { timeout: 10000 })

  // main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('Received')).toBeVisible()
  await expect(page.getByText('5,000 SATS')).toBeVisible()
  await expect(page.getByText('Sent')).toBeVisible()
  await expect(page.getByText(`- ${total}`)).toBeVisible()
})

// wallet balance is 1000 sats, wants to send 1000 sats onchain,
// since it's a max send, wallet will calculate the fees and deduct from the amount,
// so user will receive less than 1000 sats onchain, but it will be a successful send.
// since 1000 sats is below the minimum for chain swap, wallet will use collaborative exit to send onchain
test('should send MAX to onchain address with collaborative exit', async ({ page }) => {
  // set fees
  execSync('docker exec -t ark arkd fees intent --onchain-output "200.0"')

  // create wallet
  await createWallet(page)

  // get offchain address
  const arkAddress = await receiveOffchain(page)
  expect(arkAddress).toBeDefined()
  expect(arkAddress).toBeTruthy()

  // faucet
  await faucetOffchain(arkAddress, 1000)
  await waitForPaymentReceived(page)

  // main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('1,000', { exact: true })).toBeVisible()
  await expect(page.getByText('+ 1,000 SATS')).toBeVisible()

  // send page
  const someOnchainAddress = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'

  // go to send page
  await page.getByTestId('tab-wallet').click()
  await page.getByText('Send').click()

  // fill address
  await page.locator('ion-input[name="send-address"] input').fill(someOnchainAddress)

  // click max
  await page.getByTestId('input-amount-max').click()

  await page.waitForSelector('text=Fees will be deducted from the amount sent', { timeout: 2000 })

  // continue to send
  await page.getByText('Continue').click()

  // details page
  await expect(page.getByTestId('Amount')).toContainText('800 SATS')
  await expect(page.getByTestId('Total')).toContainText('1,000 SATS')
  await expect(page.getByTestId('Network fees')).toContainText('200 SATS')

  await page.getByText('Tap to Sign').click()
  await page.waitForSelector('text=1,000 SATS sent successfully', { timeout: 10000 })

  // main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('- 1,000 SATS')).toBeVisible()
  await expect(page.getByText('Sent')).toBeVisible()

  // clear fees
  execSync('docker exec -t ark arkd fees clear')
})
