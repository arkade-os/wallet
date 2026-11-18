import { test, expect, createWallet, isDesktop, navLocator, navigateToActivity } from './utils'
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
  // Activity is a sidebar entry on desktop and Home's "View all" on a phone, where the header
  // keeps only Scan and Settings. Both are there on an empty wallet.
  await expect(isDesktop(page) ? navLocator(page, 'activity') : page.getByTestId('activity-view-all')).toBeVisible()
  await expect(navLocator(page, 'settings')).toBeVisible()

  await navigateToActivity(page)
  await expect(page.getByText(tr.common.noTransactionsYet)).toBeVisible()
})
