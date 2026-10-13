import { test, expect, createWallet, navLocator, navigateToActivity } from './utils'
import { translations } from '../../lib/i18n'

const tr = translations.en

test('should create a new wallet', async ({ page }) => {
  // Create wallet
  await createWallet(page)

  // Verify wallet main page
  await expect(page.getByTestId('main-balance')).toContainText('0')
  await expect(page.getByRole('button', { name: 'Send' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Receive' })).toBeVisible()
  await expect(page.getByTestId('tab-settings')).not.toBeVisible()
  await expect(page.getByTestId('tab-wallet')).not.toBeVisible()
  await expect(page.getByTestId('tab-apps')).not.toBeVisible()
  await expect(navLocator(page, 'activity')).toBeVisible()
  await expect(navLocator(page, 'settings')).toBeVisible()

  await navigateToActivity(page)
  await expect(page.getByText(tr.components.noTransactions)).toBeVisible()
})
