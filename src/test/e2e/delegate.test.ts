import { test, expect } from '@playwright/test'
import { createWallet } from './utils'

test('should toggle delegates', async ({ page }) => {
  // create wallet
  await createWallet(page)

  await page.getByTestId('tab-settings').click()
  await page.getByText('advanced', { exact: true }).click()
  await page.getByText('delegates', { exact: true }).click()

  let toggle = page.getByTestId('toggle-delegates')
  await expect(toggle).toBeVisible()

  // delegate may default to off in CI (no delegator service)
  const initialChecked = await toggle.getAttribute('checked')

  await toggle.click()

  const maybeLater = page.getByRole('button', { name: 'Maybe later' })
  await maybeLater.waitFor({ state: 'visible', timeout: 150 }).catch(() => {})
  if (await maybeLater.isVisible()) {
    await maybeLater.click({ force: true })
    await maybeLater.waitFor({ state: 'hidden' }).catch(() => {})
  }

  await page.getByLabel('Go back').click()
  await page.getByText('delegates', { exact: true }).click()
  toggle = page.getByTestId('toggle-delegates')

  const expectedAfterToggle = initialChecked === 'true' ? 'false' : 'true'
  await expect(toggle).toHaveAttribute('checked', expectedAfterToggle)

  if (expectedAfterToggle === 'true') {
    await expect(page.getByTestId('delegate-card')).toBeVisible()
  } else {
    await expect(page.getByTestId('delegate-card')).not.toBeVisible()
  }
})
