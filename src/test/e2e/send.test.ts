import { prettyNumber } from '../../lib/format'
import {
  test,
  expect,
  createWallet,
  fundWallet,
  prePay,
  enableAssets,
  mintAsset,
  handleKeyboardInput,
  createWalletWithFiat,
  navigateHome,
  navigateToAssets,
} from './utils'
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
  await expect(page.getByTestId('Network fees')).toContainText('0 sats')
  await expect(page.getByTestId('Amount')).toContainText('2,000 sats')
  await expect(page.getByTestId('Total')).toContainText('2,000 sats')

  // finalize payment
  await page.getByText('Tap to Sign').click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })
  await page.waitForSelector('text=Payment sent!', { timeout: 30000 })
  await expect(page.getByText('2,000 sats sent successfully')).toBeVisible()

  // main page
  await page.getByText('Sounds good').click()
  await expect(page.getByText('+ 5,000 sats')).toBeVisible()
  await page.waitForSelector('text=- 2,000 sats', { timeout: 10000 })
  await expect(page.getByText('Sent')).toBeVisible()

  // go to send page
  await page.getByText('Send').click()

  // fill address
  await page.locator('input[name="send-address"]').fill(someArkAddress)

  // click max
  await page.waitForSelector(`text=3,000 sats available`, { timeout: 2100 })
  await page.getByTestId('input-amount-max').click()

  // continue to details page
  await page.getByText('Continue').click()

  // details page
  await expect(page.getByTestId('Network fees')).toContainText('0 sats')
  await expect(page.getByTestId('Amount')).toContainText('3,000 sats')
  await expect(page.getByTestId('Total')).toContainText('3,000 sats')

  await page.getByText('Tap to Sign').click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })
  await page.waitForSelector('text=3,000 sats sent successfully', { timeout: 10000 })

  // main page
  await page.getByText('Sounds good').click()
  await page.waitForSelector('text=- 3,000 sats', { timeout: 10000 })
})

test('should send usds (some and max) to ark address', async ({ page, isMobile }) => {
  // create wallet
  await createWalletWithFiat(page)
  const usdsReceived = await fundWallet(page, 5000)
  const usdsToSend = 2
  const usdsRemaining = (usdsReceived - usdsToSend).toFixed(2)

  const someArkAddress =
    'tark1qr340xg400jtxat9hdd0ungyu6s05zjtdf85uj9smyzxshf98nda' +
    'h6u2nredqtn0cr4p4zqz53gsmhju4l9t7x47kzleesa9dprx7e56xhzlen'

  // send page
  await prePay(page, someArkAddress, isMobile, usdsToSend)

  // details page
  await expect(page.getByTestId('Network fees')).toContainText('$0.00')
  await expect(page.getByTestId('Amount')).toContainText('$2.00')
  await expect(page.getByTestId('Total')).toContainText('$2.00')

  // finalize payment
  await page.getByText('Tap to Sign').click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })
  await page.waitForSelector('text=Payment sent!', { timeout: 30000 })
  await expect(page.getByText('$2.00 sent successfully')).toBeVisible()

  // main page
  await page.getByText('Sounds good').click()
  await page.waitForSelector('text=$2.00', { timeout: 10000 })
  await expect(page.getByText('Sent')).toBeVisible()

  // go to send page
  await page.getByText('Send').click()

  // fill address
  await page.locator('input[name="send-address"]').fill(someArkAddress)

  // click max
  await page.waitForSelector(`text=$${usdsRemaining} available`, { timeout: 2100 })
  await page.getByTestId('input-amount-max').click()
  const inputAmount = await page.locator('input[name="send-amount"]').inputValue()
  expect(Number(inputAmount).toFixed(2)).toBe(usdsRemaining)

  // continue to details page
  await page.getByText('Continue').click()

  // details page
  await expect(page.getByTestId('Network fees')).toContainText('$0.00')
  await expect(page.getByTestId('Amount')).toContainText(`$${usdsRemaining}`)
  await expect(page.getByTestId('Total')).toContainText(`$${usdsRemaining}`)

  await page.getByText('Tap to Sign').click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })
  await page.waitForSelector(`text=$${usdsRemaining} sent successfully`, { timeout: 10000 })

  // main page
  await page.getByText('Sounds good').click()
  await page.waitForSelector(`text=$${usdsRemaining}`, { timeout: 10000 })
})

test('should send assets (some and max) to ark address', async ({ page, isMobile }) => {
  // constants
  const mintAmount = 1000
  const sendAmount = 123.45
  const sendAmountMax = 876.55

  // create wallet
  await createWallet(page)
  await fundWallet(page, 5000)
  await enableAssets(page)
  await mintAsset(page, { amount: mintAmount.toString(), name: 'TestCoin', ticker: 'TST', decimals: 2 })

  // assert success screen
  await expect(page.getByText('TestCoin')).toBeVisible()
  await expect(page.getByText('TST')).toBeVisible()
  await page.getByText('Back to Arkade Mint').click()
  await page.getByLabel('Go back').click()

  // main page
  await navigateHome(page)
  await page.waitForSelector('text=Issuance', { timeout: 10000 })

  // send page
  const someArkAddress =
    'tark1qr340xg400jtxat9hdd0ungyu6s05zjtdf85uj9smyzxshf98nda' +
    'h6u2nredqtn0cr4p4zqz53gsmhju4l9t7x47kzleesa9dprx7e56xhzlen'

  // unverified assets are excluded from the send picker; the sanctioned path
  // is the asset detail screen, which preselects the asset in the send form
  await navigateToAssets(page)
  await page.getByTestId(/^asset-row-TST-/).click()
  await page.getByText('Send', { exact: true }).click()

  // fill address
  await page.locator('input[name="send-address"]').fill(someArkAddress)

  // fill amount
  if (isMobile) {
    await page.locator('input[name="send-amount"]').click()
    await handleKeyboardInput(page, sendAmount)
  } else {
    await page.locator('input[name="send-amount"]').fill(sendAmount.toString())
  }

  // continue to details page
  await page.getByText('Continue').click()

  // details page
  await expect(page.getByTestId('send-details-asset-name')).toHaveText('TestCoin (TST)')
  await expect(page.getByTestId('send-details-asset-amount')).toHaveText(`${sendAmount} TST`)
  await expect(page.getByTestId('Network fees')).toHaveText('0 sats')
  await expect(page.getByTestId('Amount')).toHaveText('0 sats')
  await expect(page.getByTestId('Total')).toHaveText('0 sats')

  await page.getByText('Tap to Sign').click()
  await page.waitForSelector(`text=${sendAmount} TST sent successfully`, { timeout: 10000 })

  // main page
  await page.getByText('Sounds good').click()
  await page.waitForSelector(`text=-${sendAmount} TST`, { timeout: 10000 })
  await expect(page.getByText('Sent')).toBeVisible()

  // send again via the asset detail screen
  await navigateToAssets(page)
  await page.getByTestId(/^asset-row-TST-/).click()
  await page.getByText('Send', { exact: true }).click()

  // fill address
  await page.locator('input[name="send-address"]').fill(someArkAddress)

  // click max
  await page.getByTestId('input-amount-max').click()
  const inputAmount = await page.locator('input[name="send-amount"]').inputValue()
  expect(inputAmount).toBe(sendAmountMax.toString())

  // continue to details page
  await page.getByText('Continue').click()

  // details page
  await expect(page.getByTestId('send-details-asset-name')).toHaveText('TestCoin (TST)')
  await expect(page.getByTestId('send-details-asset-amount')).toHaveText(`${sendAmountMax} TST`)
  await expect(page.getByTestId('Network fees')).toHaveText('0 sats')
  await expect(page.getByTestId('Amount')).toHaveText('0 sats')
  await expect(page.getByTestId('Total')).toHaveText('0 sats')

  await page.getByText('Tap to Sign').click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })
  await page.waitForSelector(`text=${sendAmountMax} TST sent successfully`, { timeout: 10000 })

  // main page
  await page.getByText('Sounds good').click()
  await page.waitForSelector(`text=-${sendAmountMax} TST`, { timeout: 10000 })
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
  await expect(page.getByTestId('Amount')).toContainText('2,000 sats')
  const fees = await page.getByTestId('Network fees').textContent()
  expect(fees).not.toBeNull()
  const feesNumber = parseInt(fees!.replace(/[^0-9]/g, ''), 10)
  expect(feesNumber).toBeGreaterThan(0)

  await page.getByText('Tap to Sign').click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })

  // main page
  await page.getByText('Sounds good').click()
  await page.waitForSelector('text=Sent', { timeout: 10000 })

  const balance = 5000 - feesNumber - 2000
  expect(balance).toBeLessThan(3000) // balance should be less than 3000 sats

  // go to send page
  await page.getByText('Send').click()

  // fill address
  await page.locator('input[name="send-address"]').fill(someOnchainAddress)

  // click max
  await page.waitForSelector(`text=${prettyNumber(balance)} sats available`, { timeout: 2100 })
  await page.getByTestId('input-amount-max').click()
  await page.waitForSelector('text=Fees will be deducted from the amount sent', { timeout: 2000 })
  const inputAmount = await page.locator('input[name="send-amount"]').inputValue()
  expect(inputAmount).toBe(balance.toString())

  // continue to send
  await page.getByText('Continue').click()

  // details page
  await expect(page.getByTestId('Total')).toContainText(`${prettyNumber(balance)} sats`)

  await page.getByText('Tap to Sign').click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })
  await page.waitForSelector(`text=${prettyNumber(balance)} sats sent successfully`, { timeout: 10000 })

  // main page
  await page.getByText('Sounds good').click()
  await page.waitForSelector(`text=- ${prettyNumber(balance)} sats`, { timeout: 10000 })
})

test('should send usds (some and max) to onchain address with chain swap', async ({ page, isMobile }) => {
  // create wallet
  await createWalletWithFiat(page)
  await fundWallet(page, 5000)
  const usdsToSend = 2

  const someOnchainAddress = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'

  // send page
  await prePay(page, someOnchainAddress, isMobile, usdsToSend)

  // details page
  await expect(page.getByTestId('Amount')).toContainText(`$${usdsToSend.toFixed(2)}`)
  const fees = await page.getByTestId('Network fees').textContent()
  expect(fees).not.toBeNull()
  const feesNumber = parseFloat(fees!.replace(/[^0-9.]/g, ''))
  expect(feesNumber).toBeGreaterThan(0)
  const totalSent = usdsToSend + feesNumber

  await page.getByText('Tap to Sign').click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })
  await page.waitForSelector('text=Payment sent!', { timeout: 30000 })
  await expect(page.getByText(`$${totalSent.toFixed(2)} sent successfully`)).toBeVisible()

  // main page
  await page.getByText('Sounds good').click()
  await expect(page.getByText(`$${totalSent.toFixed(2)}`)).toBeVisible()
  await expect(page.getByText('Sent')).toBeVisible()

  const balanceText = await page.getByTestId('main-balance').textContent()
  const balance = Number((balanceText ?? '').replace(/[^\d.-]/g, '') || '0')

  // go to send page
  await page.getByText('Send').click()

  // fill address
  await page.locator('input[name="send-address"]').fill(someOnchainAddress)

  // click max
  await page.waitForSelector(`text=$${balance} available`, { timeout: 2100 })
  await page.getByTestId('input-amount-max').click()
  await page.waitForSelector('text=Fees will be deducted from the amount sent', { timeout: 2000 })

  // continue to send
  await page.getByText('Continue').click()

  // details page
  await expect(page.getByTestId('Total')).toContainText(`$${balance.toFixed(2)}`)

  await page.getByText('Tap to Sign').click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })
  await expect(page.getByText(`$${balance.toFixed(2)} sent successfully`)).toBeVisible()

  // main page
  await page.getByText('Sounds good').click()
  await page.waitForSelector('text=$0.00', { timeout: 10000 })
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
  await expect(page.getByTestId('Amount')).toContainText('700 sats')
  const fees = await page.getByTestId('Network fees').textContent()
  expect(fees).not.toBeNull()
  const feesNumber = parseInt(fees!.replace(/[^0-9]/g, ''), 10)
  expect(feesNumber).toBeGreaterThan(0)
  const totalSent = 700 + feesNumber

  await page.getByText('Tap to Sign').click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })
  await page.waitForSelector('text=Payment sent!', { timeout: 30000 })
  await expect(page.getByText(`${totalSent} sats sent successfully`)).toBeVisible()

  // main page
  await page.getByText('Sounds good').click()
  await expect(page.getByText('Received')).toBeVisible()
  await page.waitForSelector('text=Sent', { timeout: 10000 })
  await expect(page.getByText(`- ${totalSent} sats`)).toBeVisible()

  const balance = 1800 - totalSent

  // go to send page
  await page.getByText('Send').click()

  // fill address
  await page.locator('input[name="send-address"]').fill(someOnchainAddress)

  // click max
  await page.waitForSelector(`text=${prettyNumber(balance)} sats available`, { timeout: 2100 })
  await page.getByTestId('input-amount-max').click()
  await page.waitForSelector('text=Fees will be deducted from the amount sent', { timeout: 2000 })
  const inputAmount = await page.locator('input[name="send-amount"]').inputValue()
  expect(inputAmount).toBe(balance.toString())

  // continue to send
  await page.getByText('Continue').click()

  // details page
  await expect(page.getByTestId('Total')).toContainText(`${balance} sats`)

  await page.getByText('Tap to Sign').click()
  await page.getByTestId('loading-logo').waitFor({ timeout: 3000 })
  await page.waitForSelector(`text=${balance} sats sent successfully`, { timeout: 20000 })

  // main page
  await page.getByText('Sounds good').click()
  await page.waitForSelector(`text=- ${balance} sats`, { timeout: 10000 })

  // clear fees
  execSync('docker exec -t arkd arkd fees clear')
})
