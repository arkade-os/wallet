import { test, expect, createWallet, createWalletWithPassword, navigateToSettings } from './utils'
import { translations } from '../../lib/i18n'

const tr = translations.en

test('should be able to get recovery phrase without password', async ({ page }) => {
  // Create wallet (mnemonic-based by default)
  await createWallet(page)

  // Go to Settings > Backup
  await navigateToSettings(page)
  await page.getByText(tr.settings.backup).click()
  await expect(page.getByText(tr.backup.enoughToRestore)).toBeVisible()

  // Verify secret is obfuscated
  const obfuscated = await page.getByTestId('private-key').textContent()
  expect(obfuscated).toMatch(/^\*+$/)

  // Reveal recovery phrase
  await page.getByText(tr.backup.viewRecoveryPhrase).click()
  const message = tr.backup.keepSafe.replace('{secret}', 'recovery phrase')
  await expect(page.getByText(message)).toBeVisible()
  await page.getByText(tr.backup.confirm).click()

  // Verify 12-word mnemonic is shown
  const mnemonic = await page.getByTestId('private-key').textContent()
  expect(mnemonic?.trim().split(/\s+/).length).toBe(12)
})

test('should be able to get recovery phrase with password', async ({ page }) => {
  // Create wallet (mnemonic-based by default)
  await createWalletWithPassword(page, 'testpassword')

  // Go to Settings > Backup
  await navigateToSettings(page)
  await page.getByText(tr.settings.backup).click()
  await expect(page.getByText(tr.backup.enoughToRestore)).toBeVisible()

  // Verify secret is obfuscated
  const obfuscated = await page.getByTestId('private-key').textContent()
  expect(obfuscated).toMatch(/^\*+$/)

  // Reveal recovery phrase
  await page.getByText(tr.backup.viewRecoveryPhrase).click()
  const message = tr.backup.keepSafe.replace('{secret}', 'recovery phrase')
  await expect(page.getByText(message)).toBeVisible()
  await page.locator('div[data-testid="backup-password-input"] input').fill('testpassword')
  await page.getByText(tr.backup.confirm).click()
  await page.waitForTimeout(500) // wait for modal to close

  // Verify 12-word mnemonic is shown
  const mnemonic = await page.getByTestId('private-key').textContent()
  expect(mnemonic?.trim().split(/\s+/).length).toBe(12)
})
