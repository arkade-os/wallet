import { test, expect, createWallet, createWalletWithPassword, navigateToSettings } from './utils'

test('should have lock wallet option', async ({ page }) => {
  // Create wallet
  await createWallet(page)

  // Go to settings and check for lock wallet option
  await navigateToSettings(page)
  await page.getByText('lock wallet', { exact: true }).click()
  await expect(page.getByText('No password defined')).toBeVisible()
  await expect(page.getByText('You need to set a password to lock.')).toBeVisible()
  await expect(page.getByText('Set password')).toBeVisible()
})

test('should set and verify password', async ({ page }) => {
  // Create wallet
  await createWallet(page)

  // Go to settings and set password
  await navigateToSettings(page)
  await page.getByText('lock wallet', { exact: true }).click()
  await page.getByText('Set password').click()
  await page.locator('div[data-testid="new-password"] input').fill('testpassword')
  await page.locator('div[data-testid="confirm-password"] input').fill('testpassword')
  await page.getByText('Save password').click()

  // Verify password is set
  await expect(page.getByText('Password changed')).toBeVisible()
})

test('should lock and unlock wallet without previous password', async ({ page }) => {
  // Create wallet
  await createWallet(page)

  // Set password
  await navigateToSettings(page)
  await page.getByText('lock wallet', { exact: true }).click()
  await page.getByText('Set password').click()
  await page.locator('div[data-testid="new-password"] input').fill('testpassword')
  await page.locator('div[data-testid="confirm-password"] input').fill('testpassword')
  await page.getByText('Save password').click()
  await page.getByLabel('Go back').click()
  await page.getByLabel('Go back').click()

  // Lock wallet
  await navigateToSettings(page)
  await page.getByText('lock wallet', { exact: true }).click()
  await page.getByText('Lock wallet').click()

  // Verify wallet is locked
  await expect(page.getByText('Insert password')).toBeVisible()

  // Unlock wallet
  await page.locator('div[data-testid="password"] input').fill('testpassword')
  await page.getByText('Unlock wallet').click()

  // Verify wallet is unlocked
  await page.waitForSelector('text=Receive', { state: 'visible', timeout: 5000 })
})

test('should lock and unlock wallet with previous password', async ({ page }) => {
  // Create wallet
  await createWalletWithPassword(page, 'testpassword')

  // Lock wallet
  await navigateToSettings(page)
  await page.getByText('lock wallet', { exact: true }).click()
  await page.getByText('Lock wallet').click()

  // Verify wallet is locked
  await expect(page.getByText('Insert password')).toBeVisible()

  // Unlock wallet
  await page.locator('div[data-testid="password"] input').fill('testpassword')
  await page.getByText('Unlock wallet').click()

  // Verify wallet is unlocked
  await page.waitForSelector('text=Receive', { state: 'visible', timeout: 5000 })
})
