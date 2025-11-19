import { test, expect } from '@playwright/test'

// Test to verify that settings are saved to nostr and restored correctly
// Since config persists across wallet resets, we need to add an extra step:
// 1. Enable nostr backups
// 2. Change a setting (theme to dark)
// 3. Verify setting is dark
// 4. Disable nostr backups
// 5. Change setting (theme to light)
// 6. Verify setting is light
// 7. Get nsec key
// 8. Reset wallet
// 9. Restore wallet with nsec key
// 10. Verify setting is dark (proving it was restored from nostr)
test('should save config to nostr', async ({ page }) => {
  // start
  await page.goto('/')

  // create new wallet
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Skip for now').click()
  await page.getByText('+ Create wallet').click()
  await page.getByText('Go to wallet').click()

  // enable nostr backups
  await page.getByText('Settings').click()
  await page.getByText('Backup and privacy').click()
  await page.getByText('Enable Nostr backups').click()

  // change theme to dark
  await page.getByText('Settings').click()
  await page.getByText('general', { exact: true }).click()
  await expect(page.getByText('Light')).toBeVisible()
  await page.getByText('Theme').click()
  await page.getByText('Dark').click()

  // verify theme is dark
  await page.getByText('Settings').click()
  await page.getByText('general', { exact: true }).click()
  await expect(page.getByText('Dark')).toBeVisible()

  // disable nostr backups
  await page.getByText('Settings').click()
  await page.getByText('Backup and privacy').click()
  await page.getByText('Enable Nostr backups').click()

  // change theme to light
  await page.getByText('Settings').click()
  await page.getByText('general', { exact: true }).click()
  await expect(page.getByText('Dark')).toBeVisible()
  await page.getByText('Theme').click()
  await page.getByText('Light').click()

  // verify theme is light
  await page.getByText('Settings').click()
  await page.getByText('general', { exact: true }).click()
  await expect(page.getByText('Light')).toBeVisible()

  // get nsec
  await page.getByText('Settings').click()
  await page.getByText('Backup and privacy').click()
  const nsec = await page.locator('p').nth(2).innerText()
  expect(nsec.startsWith('nsec1')).toBe(true)

  // reset wallet
  await page.getByText('Settings').click()
  await page.getByText('Reset wallet').click()
  await page.getByText('I have backed up my wallet').click()
  await page.getByRole('contentinfo').getByText('Reset wallet').click()
  await page.waitForTimeout(1000)

  // restore wallet
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Continue').click()
  await page.getByText('Skip for now').click()
  await page.getByText('Other login options').click()
  await page.getByText('Restore wallet').click()
  await page.locator('ion-input[name="private-key"] input').fill(nsec)
  await page.getByText('Continue').click()
  await expect(page.getByText('Wallet restored successfully!')).toBeVisible()
  await page.getByText('Go to wallet').click()

  // verify theme is dark
  await page.getByText('Settings').click()
  await page.getByText('general', { exact: true }).click()
  await expect(page.getByText('Dark')).toBeVisible()
})
