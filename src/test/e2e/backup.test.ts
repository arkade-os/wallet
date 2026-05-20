import { test, expect, createWallet, createWalletWithPassword } from './utils'

test('should be able to get recovery phrase without password', async ({ page }) => {
  // Create wallet (mnemonic-based by default)
  await createWallet(page)

  // Go to Settings > Backup
  await page.getByTestId('tab-settings').click()
  await page.getByText('Backup').click()
  await expect(page.getByText('This is enough to restore your wallet')).toBeVisible()

  // Verify secret is obfuscated
  const obfuscated = await page.getByTestId('private-key').textContent()
  expect(obfuscated).toMatch(/^\*+$/)

  // Reveal recovery phrase
  await page.getByText('View recovery phrase').click()
  await expect(page.getByText('Keep your recovery phrase safe')).toBeVisible()
  await page.getByText('Confirm').click()

  // Verify 12-word mnemonic is shown
  const mnemonic = await page.getByTestId('private-key').textContent()
  expect(mnemonic?.trim().split(/\s+/).length).toBe(12)
})

test('should be able to get recovery phrase with password', async ({ page }) => {
  // Create wallet (mnemonic-based by default)
  await createWalletWithPassword(page, 'testpassword')

  // Go to Settings > Backup
  await page.getByTestId('tab-settings').click()
  await page.getByText('Backup').click()
  await expect(page.getByText('This is enough to restore your wallet')).toBeVisible()

  // Verify secret is obfuscated
  const obfuscated = await page.getByTestId('private-key').textContent()
  expect(obfuscated).toMatch(/^\*+$/)

  // Reveal recovery phrase
  await page.getByText('View recovery phrase').click()
  await expect(page.getByText('Keep your recovery phrase safe')).toBeVisible()
  await page.locator('div[data-testid="backup-password-input"] input').fill('testpassword')
  await page.getByText('Confirm').click()
  await page.waitForTimeout(500) // wait for modal to close

  // Verify 12-word mnemonic is shown
  const mnemonic = await page.getByTestId('private-key').textContent()
  expect(mnemonic?.trim().split(/\s+/).length).toBe(12)
})
