import { test, expect } from '@playwright/test'
import { createWallet, createWalletWithPassword } from './utils'

test('should be able to get nsec without password', async ({ page }) => {
  // Create wallet
  await createWallet(page)

  // Go to Settings > Backup
  await page.getByTestId('tab-settings').click()
  await page.getByText('Backup').click()
  expect(page.getByText('This is enough to restore your wallet')).toBeVisible()

  // Verify password input is not shown
  const obfuscated = await page.getByTestId('private-key').textContent()
  expect(obfuscated).toMatch(/^\*+$/)

  // Reveal private key
  await page.getByText('View private key').click()
  expect(page.getByText('Keep your private key safe')).toBeVisible()
  await page.getByText('Confirm').click()

  // Verify nsec is shown
  const nsec = await page.getByTestId('private-key').textContent()
  expect(nsec).toMatch(/^nsec1[0-9a-zA-Z]+$/)
})

test('should be able to get nsec with password', async ({ page }) => {
  // Create wallet
  await createWalletWithPassword(page, 'testpassword')

  // Go to Settings > Backup
  await page.getByTestId('tab-settings').click()
  await page.getByText('Backup').click()
  expect(page.getByText('This is enough to restore your wallet')).toBeVisible()

  // Verify password input is not shown
  const obfuscated = await page.getByTestId('private-key').textContent()
  expect(obfuscated).toMatch(/^\*+$/)

  // Reveal private key
  await page.getByText('View private key').click()
  expect(page.getByText('Keep your private key safe')).toBeVisible()
  await page.locator('input[name="ion-input-3"]').fill('testpassword')
  await page.getByText('Confirm').click()
  await page.waitForTimeout(500) // wait for modal to close

  // Verify nsec is shown
  const nsec = await page.getByTestId('private-key').textContent()
  expect(nsec).toMatch(/^nsec1[0-9a-zA-Z]+$/)
})
