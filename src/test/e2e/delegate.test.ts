import { test, expect } from '@playwright/test'
import { createWallet } from './utils'

test('should toggle delegates', async ({ page }) => {
  // create wallet
  await createWallet(page)

  await page.getByTestId('tab-settings').click()
  await page.getByText('advanced', { exact: true }).click()
  await page.getByText('delegates', { exact: true }).click()

  const toggle = page.getByTestId('toggle-delegates')
  await expect(toggle).toHaveAttribute('checked', 'true')
  await expect(page.getByTestId('delegate-card')).toBeVisible()

  toggle.click()

  await expect(toggle).toBeVisible()
  await expect(toggle).toHaveAttribute('checked', 'false')
  await expect(page.getByTestId('delegate-card')).not.toBeVisible()
})
