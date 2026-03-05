import { test, expect } from '@playwright/test'
import { createWallet } from './utils'

test('should toggle delegates', async ({ page }) => {
  // create wallet
  await createWallet(page)

  await page.getByTestId('tab-settings').click()
  await page.getByText('advanced', { exact: true }).click()
  await page.getByText('delegates', { exact: true }).click()

  let toggle = page.getByTestId('toggle-delegates')
  await expect(toggle).toHaveAttribute('checked', 'true')
  await expect(page.getByTestId('delegate-card')).toBeVisible()

  await toggle.click()

  const maybeLater = page.getByRole('button', { name: 'Maybe later' })
  await maybeLater.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})
  if (await maybeLater.isVisible()) {
    await maybeLater.click({ force: true })
    await maybeLater.waitFor({ state: 'hidden' }).catch(() => {})
  }

  await page.getByTestId('tab-settings').click()
  await page.getByText('advanced', { exact: true }).click()
  await page.getByText('delegates', { exact: true }).click()
  toggle = page.getByTestId('toggle-delegates')
  await expect(toggle).toBeVisible()
  await expect(toggle).toHaveAttribute('checked', 'false')
  await expect(page.getByTestId('delegate-card')).not.toBeVisible()
})
