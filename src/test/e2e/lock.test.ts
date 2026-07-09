import { test, expect, createWallet, createPasswordlessWallet, navigateToSettings } from './utils'

// Passkey wallets are the default: lock → passkey unlock. The password path is
// legacy (passwordless-fallback wallets); it's slower to set up (the passkey
// ceremony must fail first), so it gets a larger timeout.

test('should lock and unlock a passkey wallet', async ({ page }) => {
  await createWallet(page)

  await navigateToSettings(page)
  await page.getByText('lock wallet', { exact: true }).click()
  // a passkey wallet can always lock — no password prompt
  await expect(page.getByText('Lock your wallet')).toBeVisible()
  await page.getByRole('button', { name: 'Lock Wallet' }).click()

  // unlock screen asks for the passkey (auto-approved by the virtual authenticator)
  await expect(page.getByText('Unlock with your passkey')).toBeVisible()
  await page.getByRole('button', { name: 'Unlock wallet' }).click()

  await page.waitForSelector('text=Receive', { state: 'visible', timeout: 15000 })
})

test('should offer passkey or password when the wallet is unprotected', async ({ page, webauthn }) => {
  test.setTimeout(120000)
  await createPasswordlessWallet(page, webauthn)

  await navigateToSettings(page)
  await page.getByText('lock wallet', { exact: true }).click()
  await expect(page.getByText('Wallet not protected')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Use a passkey' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Set Password' })).toBeVisible()
})

test('should set a password and lock/unlock with it', async ({ page, webauthn }) => {
  test.setTimeout(120000)
  await createPasswordlessWallet(page, webauthn)

  // set a password
  await navigateToSettings(page)
  await page.getByText('lock wallet', { exact: true }).click()
  await page.getByRole('button', { name: 'Set Password' }).click()
  await page.locator('div[data-testid="new-password"] input').fill('testpassword')
  await page.locator('div[data-testid="confirm-password"] input').fill('testpassword')
  await page.getByText('Save password').click()
  await expect(page.getByText('Password changed')).toBeVisible()
  await page.getByLabel('Go back').click()
  await page.getByLabel('Go back').click()

  // lock with the password
  await navigateToSettings(page)
  await page.getByText('lock wallet', { exact: true }).click()
  await page.getByText('Lock Wallet').click()

  await expect(page.getByText('Insert password')).toBeVisible()
  await page.locator('div[data-testid="password"] input').fill('testpassword')
  await page.getByText('Unlock wallet').click()

  await page.waitForSelector('text=Receive', { state: 'visible', timeout: 15000 })
})
