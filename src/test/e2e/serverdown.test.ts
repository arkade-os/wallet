import { test, expect } from './utils'
import { translations } from '../../lib/i18n'

const tr = translations.en

test('should show server unreachable', async ({ page }) => {
  await page.goto('/')
  await page.context().setOffline(true)
  await expect(page.getByText(tr.init.arkadeServerUnreachable)).toBeVisible()
})
