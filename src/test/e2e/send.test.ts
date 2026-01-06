import { test, expect } from '@playwright/test'
import { exec } from 'child_process'
import { createWallet, pay, receiveOffchain, waitForPaymentReceived } from './utils'

test('should send to ark address', async ({ page, isMobile }) => {
  // create wallet
  await createWallet(page)

  // get offchain address
  const arkAddress = await receiveOffchain(page)
  expect(arkAddress).toBeDefined()
  expect(arkAddress).toBeTruthy()

  // faucet
  exec(`docker exec -t arkd ark send --to ${arkAddress} --amount 5000 --password secret`)
  await waitForPaymentReceived(page)

  // main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('5,000', { exact: true })).toBeVisible()
  await expect(page.getByText('+ 5,000 SATS')).toBeVisible()

  // send page
  const someArkAddress =
    'tark1qr340xg400jtxat9hdd0ungyu6s05zjtdf85uj9smyzxshf98nda' +
    'h6u2nredqtn0cr4p4zqz53gsmhju4l9t7x47kzleesa9dprx7e56xhzlen'
  await pay(page, someArkAddress, isMobile, 2000)
  await expect(page.getByText('SATS sent successfully')).toBeVisible()

  // main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('3,000SATS')).toBeVisible()
  await expect(page.getByText('- 2,000 SATS')).toBeVisible()
  await expect(page.getByText('Sent')).toBeVisible()
})

test('should send to onchain address', async ({ page, isMobile }) => {
  // set fees
  exec('docker exec -t arkd arkd fees intent --onchain-output "200.0"')

  // create wallet
  await createWallet(page)

  // get offchain address
  const arkAddress = await receiveOffchain(page)
  expect(arkAddress).toBeDefined()
  expect(arkAddress).toBeTruthy()

  // faucet
  exec(`docker exec -t arkd ark send --to ${arkAddress} --amount 5000 --password secret`)
  // set fees
  await waitForPaymentReceived(page)

  // main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('5,000', { exact: true })).toBeVisible()
  await expect(page.getByText('+ 5,000 SATS')).toBeVisible()

  // send page
  const someOnchainAddress = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'
  await pay(page, someOnchainAddress, isMobile, 2000)
  await expect(page.getByText('SATS sent successfully')).toBeVisible()

  // main page
  await page.getByTestId('tab-wallet').click()
  await expect(page.getByText('2,800SATS')).toBeVisible()
  await expect(page.getByText('- 2,200 SATS')).toBeVisible()
  await expect(page.getByText('Sent')).toBeVisible()

  // clear fees
  exec('docker exec -t arkd arkd fees clear')
})
