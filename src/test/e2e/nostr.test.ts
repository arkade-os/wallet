import { test, expect, createWallet, resetAndRestoreWallet, navigateToSettings, mockSolverCard } from './utils'

// Test to verify that settings are saved to nostr and restored correctly
// Since config persists across wallet resets, we need to add an extra step:
// 1. Enable nostr backups
// 2. Change a setting (currency to euro)
// 3. Verify setting is euro
// 4. Disable nostr backups
// 5. Change setting (currency to usd)
// 6. Verify setting is usd
// 7. Get nsec key
// 8. Reset wallet
// 9. Restore wallet with nsec key
// 10. Verify setting is euro (proving it was restored from nostr)
test('should save config to nostr', async ({ page }) => {
  test.setTimeout(60000)
  // create wallet
  await createWallet(page)

  // enable nostr backups
  await navigateToSettings(page)
  await page.getByText('backup', { exact: true }).click()
  await page.getByTestId('toggle-backup').click()

  // change currency to euro
  await page.getByLabel('Go back').click()
  await page.getByText('currency').click()
  await page.getByText('EUR').click()
  await page.waitForTimeout(500)

  // verify currency is euro
  await page.getByLabel('Go back').click()
  await page.getByText('currency').click()
  const shouldBeEuro = await page.locator('input[checked]').getAttribute('value')
  expect(shouldBeEuro).toBe('EUR')

  // disable nostr backups
  await page.getByLabel('Go back').click()
  await page.getByText('backup', { exact: true }).click()
  await page.getByTestId('toggle-backup').click()

  // change currency to usd
  await page.getByLabel('Go back').click()
  await page.getByText('currency').click()
  await page.getByText('USD').click()

  // verify currency is usd
  await page.getByLabel('Go back').click()
  await page.getByText('currency').click()
  const shouldBeUsd = await page.locator('input[checked]').getAttribute('value')
  expect(shouldBeUsd).toBe('USD')

  // restore wallet
  await resetAndRestoreWallet(page)

  // verify currency is euro
  await navigateToSettings(page)
  await page.getByText('currency').click()
  const hopeIsEur = await page.locator('input[checked]').getAttribute('value')
  expect(hopeIsEur).toBe('EUR')
})

test.skip('should save solver cards to nostr', async ({ page }) => {
  test.setTimeout(60000)
  // create wallet
  await createWallet(page)

  // enable nostr backups
  await navigateToSettings(page)
  await page.getByText('backup', { exact: true }).click()
  await page.getByTestId('toggle-backup').click()

  // navigate to solvers
  await page.getByLabel('Go back').click()
  await page.getByText('advanced', { exact: true }).click()
  await page.getByText('solvers', { exact: true }).click()

  // add a solver card
  await page.getByRole('button', { name: '+ Add new' }).click()
  await page.locator('textarea').fill(JSON.stringify(mockSolverCard))
  await page.getByRole('button', { name: 'Save' }).click()

  // verify solver card is added
  await expect(page.getByText('You have 1 solver card stored in your wallet.')).toBeVisible()
  await expect(page.getByText(mockSolverCard.name)).toBeVisible()

  // restore wallet
  await resetAndRestoreWallet(page)

  // verify currency is euro
  await navigateToSettings(page)
  await page.getByText('advanced', { exact: true }).click()
  await page.getByText('solvers', { exact: true }).click()
  await expect(page.getByText('You have 1 solver card stored in your wallet.')).toBeVisible()
  await expect(page.getByText(mockSolverCard.name)).toBeVisible()
})
