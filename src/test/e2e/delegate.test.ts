import { test, expect } from '@playwright/test'
import { createWallet } from './utils'

test('should toggle delegates', async ({ page }) => {
  // create wallet
  await createWallet(page)

  await page.getByTestId('tab-settings').click()
  await page.getByText('advanced', { exact: true }).click()
  await page.getByText('delegates', { exact: true }).click()

  const toggle = page.getByTestId('toggle-delegates')
  await expect(toggle).toBeVisible()

  // delegate may default to off in CI (no delegator service)
  const initialChecked = await toggle.getAttribute('checked')

  await toggle.click()

  const expectedAfterToggle = initialChecked === 'true' ? 'false' : 'true'
  await expect(toggle).toHaveAttribute('checked', expectedAfterToggle)

  if (expectedAfterToggle === 'true') {
    await expect(page.getByTestId('delegate-card')).toBeVisible()
  } else {
    await expect(page.getByTestId('delegate-card')).not.toBeVisible()
  }
})
