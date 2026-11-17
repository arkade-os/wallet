import { test, expect, type Page } from '@playwright/test'
import { translations } from '../../lib/i18n'
import { createWallet, navigateToSettings, waitForWalletPage } from './utils'

const tr = translations.en

const openExecutor = async (page: Page) => {
  await navigateToSettings(page)
  await page.getByText(tr.settings.advanced, { exact: true }).click()
  await page.getByText(tr.settings.executor, { exact: true }).click()
}

test('should toggle the executor', async ({ page }) => {
  test.setTimeout(60000)
  await createWallet(page)

  await openExecutor(page)
  let toggle = page.getByTestId('toggle-executor')
  await expect(toggle).toBeVisible()

  // off by default in CI (VITE_EXECUTOR_ENABLED=false in playwright.config.ts)
  const initialChecked = await toggle.getAttribute('data-checked')

  await toggle.click()

  // toggle triggers window.location.reload(), wait for wallet to load
  await waitForWalletPage(page)
  await openExecutor(page)
  toggle = page.getByTestId('toggle-executor')

  // the card shows whether or not an Executor answers
  if (initialChecked === 'true') {
    expect(await toggle.getAttribute('data-checked')).toBe('false')
    await expect(page.getByTestId('executor-card')).not.toBeVisible()
  } else {
    expect(await toggle.getAttribute('data-checked')).toBe('true')
    await expect(page.getByTestId('executor-card')).toBeVisible()
  }
})
