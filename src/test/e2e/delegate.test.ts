import { test, expect } from '@playwright/test'
import { createWallet } from './utils'

test('should show delegate settings', async ({ page }) => {
  // create wallet
  await createWallet(page)

  await page.getByTestId('tab-settings').click()
  await page.getByText('advanced', { exact: true }).click()
  await page.getByText('delegates', { exact: true }).click()

  const toggle = page.getByTestId('toggle-delegates')
  await expect(toggle).toBeVisible()
})
