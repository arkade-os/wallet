import { test, expect, createPasswordlessWallet, createWalletWithPassword, navigateToSettings } from './utils'

// These cover the legacy password-based lock. Passkey wallets lock/unlock via
// the passkey (covered by the passkey-flow vitest tests), so here we build the
// passwordless fallback wallet and drive the password path.

test('should offer passkey or password when the wallet is unprotected', async ({ page, webauthn }) => {
  await createPasswordlessWallet(page, webauthn)

  await navigateToSettings(page)
  await page.getByText('lock wallet', { exact: true }).click()
  await expect(page.getByText('Wallet not protected')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Use a passkey' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Set Password' })).toBeVisible()
})

test('should set and verify password', async ({ page, webauthn }) => {
  await createPasswordlessWallet(page, webauthn)

  await navigateToSettings(page)
  await page.getByText('lock wallet', { exact: true }).click()
  await page.getByRole('button', { name: 'Set Password' }).click()
  await page.locator('div[data-testid="new-password"] input').fill('testpassword')
  await page.locator('div[data-testid="confirm-password"] input').fill('testpassword')
  await page.getByText('Save password').click()

  await expect(page.getByText('Password changed')).toBeVisible()
})

test('should lock and unlock wallet without previous password', async ({ page, webauthn }) => {
  await createPasswordlessWallet(page, webauthn)

  // set a password
  await navigateToSettings(page)
  await page.getByText('lock wallet', { exact: true }).click()
  await page.getByRole('button', { name: 'Set Password' }).click()
  await page.locator('div[data-testid="new-password"] input').fill('testpassword')
  await page.locator('div[data-testid="confirm-password"] input').fill('testpassword')
  await page.getByText('Save password').click()
  await page.getByLabel('Go back').click()
  await page.getByLabel('Go back').click()

  // lock wallet
  await navigateToSettings(page)
  await page.getByText('lock wallet', { exact: true }).click()
  await page.getByText('Lock Wallet').click()

  await expect(page.getByText('Insert password')).toBeVisible()

  await page.locator('div[data-testid="password"] input').fill('testpassword')
  await page.getByText('Unlock wallet').click()

  await page.waitForSelector('text=Receive', { state: 'visible', timeout: 5000 })
})

test('should lock and unlock wallet with previous password', async ({ page, webauthn }) => {
  await createWalletWithPassword(page, 'testpassword', webauthn)

  await navigateToSettings(page)
  await page.getByText('lock wallet', { exact: true }).click()
  await page.getByText('Lock Wallet').click()

  await expect(page.getByText('Insert password')).toBeVisible()

  await page.locator('div[data-testid="password"] input').fill('testpassword')
  await page.getByText('Unlock wallet').click()

  await page.waitForSelector('text=Receive', { state: 'visible', timeout: 5000 })
})
