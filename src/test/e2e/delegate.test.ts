import { test, expect } from '@playwright/test'
import { createWallet, waitForWalletPage } from './utils'

test('should toggle delegates', async ({ page }) => {
  test.setTimeout(60000)
  // create wallet
  await createWallet(page)

  await page.getByTestId('tab-settings').click()
  await page.getByText('advanced', { exact: true }).click()
  await page.getByText('delegates', { exact: true }).click()

  let toggle = page.getByTestId('toggle-delegates')
  await expect(toggle).toBeVisible()

  // delegate may default to off in CI (no delegator service)
  const initialChecked = await toggle.getAttribute('data-checked')

  await toggle.click()

  // toggle triggers window.location.reload(), wait for wallet to load
  await waitForWalletPage(page)
  await page.getByTestId('tab-settings').click()
  await page.getByText('advanced', { exact: true }).click()
  await page.getByText('delegates', { exact: true }).click()
  toggle = page.getByTestId('toggle-delegates')

  const expectedAfterToggle = initialChecked === 'true' ? 'false' : 'true'

  if (expectedAfterToggle === 'true') {
    expect(await toggle.getAttribute('data-checked')).toBe('true')
    await expect(page.getByTestId('delegate-card')).toBeVisible()
  } else {
    expect(await toggle.getAttribute('data-checked')).toBe('false')
    await expect(page.getByTestId('delegate-card')).not.toBeVisible()
  }
})
