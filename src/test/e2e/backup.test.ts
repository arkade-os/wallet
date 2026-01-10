import { test, expect } from '@playwright/test'
import { createWallet, createWalletWithPassword } from './utils'

test('should be able to get nsec without password', async ({ page }) => {
  // Create wallet
  await createWallet(page)

  // Go to Settings > Backup
  await page.getByTestId('tab-settings').click()
  await page.getByText('Backup').click()
  await expect(page.getByText('This is enough to restore your wallet.', { exact: true })).toBeVisible()

  // Verify password input is not shown
  const obfuscated = await page.getByTestId('private-key').textContent()
  expect(obfuscated).toMatch(/^\*+$/)

  // Reveal private key
  await page.getByText('View private key').click()
  await expect(page.getByText('Keep your private key safe')).toBeVisible()
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
  await expect(page.getByText('This is enough to restore your wallet.')).toBeVisible()

  // Verify password input is not shown
  const obfuscated = await page.getByTestId('private-key').textContent()
  expect(obfuscated).toMatch(/^\*+$/)

  // Reveal private key
  await page.getByText('View private key').click()
  await expect(page.getByText('Keep your private key safe')).toBeVisible()
  await page.locator('div[data-testid="backup-password-input"] input').fill('testpassword')
  await page.getByText('Confirm').click()
  await page.waitForTimeout(500) // wait for modal to close

  // Verify nsec is shown
  const nsec = await page.getByTestId('private-key').textContent()
  expect(nsec).toMatch(/^nsec1[0-9a-zA-Z]+$/)
})

test('should be able to get npub without password', async ({ page }) => {
  // Create wallet
  await createWallet(page)

  // Go to Settings > Backup
  await page.getByTestId('tab-settings').click()
  await page.getByText('Backup').click()
  await expect(
    page.getByText('This is enough to restore your wallet in read-only mode.', { exact: true }),
  ).toBeVisible()

  // Verify public key is shown
  const pubkey = await page.getByTestId('public-key').textContent()
  expect(pubkey).toMatch(/^npub1[0-9a-zA-Z]+$/)

  await expect(page.getByText('Copy to clipboard')).toBeVisible()
})
