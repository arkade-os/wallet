import { test, expect } from './utils'

test('should show server unreachable', async ({ page }) => {
  await page.goto('/')
  await page.context().setOffline(true)
  await expect(page.getByText('Arkade server unreachable')).toBeVisible()
})
