import { prettyNumber } from '../../lib/format'
import { test, expect, createWallet, fundWallet, prePay, enableAssets, mintAsset, handleKeyboardInput } from './utils'
import { execSync } from 'child_process'

test('should send sats (some and max) to ark address', async ({ page, isMobile }) => {
  // create wallet
  await createWallet(page)
  await fundWallet(page, 5000)

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
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })
  await page.waitForSelector('text=Payment sent!', { timeout: 30000 })
  await expect(page.getByText('2,000 SATS sent successfully')).toBeVisible()

  // main page
  await page.getByText('Sounds good').click()
  await expect(page.getByText('+ 5,000 SATS')).toBeVisible()
  await page.waitForSelector('text=- 2,000 SATS', { timeout: 10000 })
  await expect(page.getByText('Sent')).toBeVisible()

  // go to send page
  await page.getByText('Send').click()

  // fill address
  await page.locator('input[name="send-address"]').fill(someArkAddress)

  // click max
  await page.getByTestId('input-amount-max').click()

  // continue to details page
  await page.getByText('Continue').click()

  // details page
  await expect(page.getByTestId('Network fees')).toContainText('0 SATS')
  await expect(page.getByTestId('Amount')).toContainText('3,000 SATS')
  await expect(page.getByTestId('Total')).toContainText('3,000 SATS')

  await page.getByText('Tap to Sign').click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })
  await page.waitForSelector('text=3,000 SATS sent successfully', { timeout: 10000 })

  // main page
  await page.getByText('Sounds good').click()
  await page.waitForSelector('text=- 3,000 SATS', { timeout: 10000 })
})

test('should send assets (some and max) to ark address', async ({ page, isMobile }) => {
  // create wallet
  await createWallet(page)
  await fundWallet(page, 5000)
  await enableAssets(page)
  await mintAsset(page, { amount: 1000, name: 'TestCoin', ticker: 'TST', decimals: 0 })

  // assert success screen
  await expect(page.getByText('TestCoin')).toBeVisible()
  await expect(page.getByText('TST')).toBeVisible()
  await page.getByText('Back to arkade mint').click()
  await page.getByLabel('Go back').click()

  // main page
  await page.getByTestId('tab-wallet').click()
  await page.waitForSelector('text=Issuance', { timeout: 10000 })

  // send page
  const someArkAddress =
    'tark1qr340xg400jtxat9hdd0ungyu6s05zjtdf85uj9smyzxshf98nda' +
    'h6u2nredqtn0cr4p4zqz53gsmhju4l9t7x47kzleesa9dprx7e56xhzlen'

  // go to send page
  await page.getByText('Send').click()

  // fill address
  await page.locator('input[name="send-address"]').fill(someArkAddress)

  // select asset
  await page.getByTestId('asset-selector').click()
  await page.getByTestId('asset-tst-option').click()

  // fill amount
  if (isMobile) {
    await page.locator('input[name="send-amount"]').click()
    await handleKeyboardInput(page, 200)
  } else {
    await page.locator('input[name="send-amount"]').fill('200')
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
  await page.getByText('Sounds good').click()
  await page.waitForSelector('text=-200 TST', { timeout: 10000 })
  await expect(page.getByText('Sent')).toBeVisible()

  // go to send page
  await page.getByText('Send').click()

  // fill address
  await page.locator('input[name="send-address"]').fill(someArkAddress)

  // select asset
  await page.getByTestId('asset-selector').click()
  await page.getByTestId('asset-tst-option').click()

  // click max
  await page.getByTestId('input-amount-max').click()

  // continue to details page
  await page.getByText('Continue').click()

  // details page
  await expect(page.getByTestId('send-details-asset-name')).toHaveText('TestCoin (TST)')
  await expect(page.getByTestId('send-details-asset-amount')).toHaveText('800 TST')
  await expect(page.getByTestId('Network fees')).toHaveText('0 SATS')
  await expect(page.getByTestId('Amount')).toHaveText('0 SATS')
  await expect(page.getByTestId('Total')).toHaveText('0 SATS')

  await page.getByText('Tap to Sign').click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })
  await page.waitForSelector('text=800 TST sent successfully', { timeout: 10000 })

  // main page
  await page.getByText('Sounds good').click()
  await page.waitForSelector('text=-800 TST', { timeout: 10000 })
})

// wallet balance is 5000 sats,
// wants to send 2000 sats onchain,
// wallet will deliver 2000 sats on final UTXO,
// which means user must pay more for chain swap fees
test('should send sats (some and max) to onchain address with chain swap', async ({ page, isMobile }) => {
  // create wallet
  await createWallet(page)
  await fundWallet(page, 5000)

  const someOnchainAddress = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'

  // send page
  await prePay(page, someOnchainAddress, isMobile, 2000)

  // details page
  await expect(page.getByTestId('Amount')).toContainText('2,000 SATS')

  await page.getByText('Tap to Sign').click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })

  // main page
  await page.getByText('Sounds good').click()
  await page.waitForSelector('text=Sent', { timeout: 10000 })

  const balanceText = await page.getByTestId('main-balance').textContent()
  const balance = parseInt(balanceText?.replace(/[^0-9]/g, '') || '0', 10)
  expect(balance).toBeLessThan(3000) // balance should be less than 3000 sats

  // go to send page
  await page.getByText('Send').click()

  // fill address
  await page.locator('input[name="send-address"]').fill(someOnchainAddress)

  // click max
  await page.getByTestId('input-amount-max').click()

  await page.waitForSelector('text=Fees will be deducted from the amount sent', { timeout: 2000 })

  // continue to send
  await page.getByText('Continue').click()

  // details page
  await expect(page.getByTestId('Total')).toContainText(`${prettyNumber(balance)} SATS`)

  await page.getByText('Tap to Sign').click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })
  await page.waitForSelector(`text=${prettyNumber(balance)} SATS sent successfully`, { timeout: 10000 })

  // main page
  await page.getByText('Sounds good').click()
  await page.waitForSelector(`text=- ${prettyNumber(balance)} SATS`, { timeout: 10000 })
})

// wallet balance is 5000 sats,
// wants to send 1000 sats onchain,
// wallet will deliver 1000 sats on final UTXO,
// which means user must pay more for output
// since 1000 sats is below the minimum for chain swap,
// wallet will use collaborative exit to send onchain
test('should send sats (some and max) to onchain address with collaborative exit', async ({ page, isMobile }) => {
  // set fees
  execSync('docker exec -t arkd arkd fees intent --onchain-output "200.0"')

  // create wallet
  await createWallet(page)
  await fundWallet(page, 1800)

  const someOnchainAddress = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'

  // send page
  await prePay(page, someOnchainAddress, isMobile, 900)

  // details page
  await expect(page.getByTestId('Amount')).toContainText('700 SATS')

  await page.getByText('Tap to Sign').click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })
  await page.waitForSelector('text=sent successfully', { timeout: 20000 })

  // main page
  await page.getByText('Sounds good').click()
  await expect(page.getByText('Received')).toBeVisible()
  await expect(page.getByText('1,800 SATS')).toBeVisible()
  await page.waitForSelector('text=Sent', { timeout: 10000 })

  const balanceText = await page.getByTestId('main-balance').textContent()
  const balance = parseInt(balanceText?.replace(/[^0-9]/g, '') || '0', 10)

  // go to send page
  await page.getByText('Send').click()

  // fill address
  await page.locator('input[name="send-address"]').fill(someOnchainAddress)

  // click max
  await page.getByTestId('input-amount-max').click()

  await page.waitForSelector('text=Fees will be deducted from the amount sent', { timeout: 2000 })

  // continue to send
  await page.getByText('Continue').click()

  // details page
  await expect(page.getByTestId('Total')).toContainText(`${prettyNumber(balance)} SATS`)

  await page.getByText('Tap to Sign').click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })
  await page.waitForSelector(`text=${prettyNumber(balance)} SATS sent successfully`, { timeout: 20000 })

  // main page
  await page.getByText('Sounds good').click()
  await page.waitForSelector(`text=- ${prettyNumber(balance)} SATS`, { timeout: 10000 })

  // clear fees
  execSync('docker exec -t arkd arkd fees clear')
})
