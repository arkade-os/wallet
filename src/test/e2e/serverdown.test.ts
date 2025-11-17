import { test, expect } from '@playwright/test'

test('should show server unreachable', async ({ page }) => {
  await page.goto('/')
  await page.context().setOffline(true)
  await expect(page.getByText('Ark server unreachable')).toBeVisible()
})
