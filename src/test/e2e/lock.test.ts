import { test, expect, createWallet, createWalletWithPassword, navigateToSettings } from './utils'
import { translations } from '../../lib/i18n'

const tr = translations.en

test('should have lock wallet option', async ({ page }) => {
  // Create wallet
  await createWallet(page)

  // Go to settings and check for lock wallet option
  await navigateToSettings(page)
  await page.getByText(tr.settings.lock, { exact: true }).click()
  await expect(page.getByText(tr.settings.noPasswordDefined)).toBeVisible()
  await expect(page.getByText(tr.settings.setPasswordToLock)).toBeVisible()
  await expect(page.getByText(tr.settings.setPassword)).toBeVisible()
})

test('should set and verify password', async ({ page }) => {
  // Create wallet
  await createWallet(page)

  // Go to settings and set password
  await navigateToSettings(page)
  await page.getByText(tr.settings.lock, { exact: true }).click()
  await page.getByText(tr.settings.setPassword).click()
  await page.locator('div[data-testid="new-password"] input').fill('testpassword')
  await page.locator('div[data-testid="confirm-password"] input').fill('testpassword')
  await page.getByText(tr.components.savePassword).click()

  // Verify password is set
  await expect(page.getByText(tr.settings.passwordChanged)).toBeVisible()
})

test('should lock and unlock wallet without previous password', async ({ page }) => {
  // Create wallet
  await createWallet(page)

  // Set password
  await navigateToSettings(page)
  await page.getByText(tr.settings.lock, { exact: true }).click()
  await page.getByText(tr.settings.setPassword).click()
  await page.locator('div[data-testid="new-password"] input').fill('testpassword')
  await page.locator('div[data-testid="confirm-password"] input').fill('testpassword')
  await page.getByText(tr.components.savePassword).click()
  await page.getByLabel('Go back').click()
  await page.getByLabel('Go back').click()

  // Lock wallet
  await navigateToSettings(page)
  await page.getByText(tr.settings.lock, { exact: true }).click()
  await page.getByText(tr.settings.lockWallet).click()

  // Verify wallet is locked
  await expect(page.getByText(tr.unlock.insertPassword)).toBeVisible()

  // Unlock wallet
  await page.locator('div[data-testid="password"] input').fill('testpassword')
  await page.getByText(tr.unlock.unlockWallet).click()

  // Verify wallet is unlocked
  await page.waitForSelector(`text=${tr.wallet.receive}`, { state: 'visible', timeout: 5000 })
})

test('should lock and unlock wallet with previous password', async ({ page }) => {
  // Create wallet
  await createWalletWithPassword(page, 'testpassword')

  // Lock wallet
  await navigateToSettings(page)
  await page.getByText(tr.settings.lock, { exact: true }).click()
  await page.getByText(tr.settings.lockWallet).click()

  // Verify wallet is locked
  await expect(page.getByText(tr.unlock.insertPassword)).toBeVisible()

  // Unlock wallet
  await page.locator('div[data-testid="password"] input').fill('testpassword')
  await page.getByText(tr.unlock.unlockWallet).click()

  // Verify wallet is unlocked
  await page.waitForSelector(`text=${tr.wallet.receive}`, { state: 'visible', timeout: 5000 })
})
