import { test, expect } from './utils'
import { translations } from '../../lib/i18n'

const tr = translations.en

test('restores from a unique BIP39 prefix by autocompleting the word', async ({ page }) => {
  await page.goto('/')
  await page.getByText(tr.init.otherLoginOptions).click()
  await page.getByText(tr.init.restoreWallet).click()

  const input = page.locator('input[name="private-key"]')
  await input.click()
  await input.pressSequentially('ah')
  await expect(input).toHaveValue('ahead ')

  await input.pressSequentially('agr')
  await expect(input).toHaveValue('ahead agree ')

  await input.pressSequentially('aban')
  await expect(input).toHaveValue('ahead agree abandon ')
})
