import { test, expect } from './utils'
import { translations } from '../../lib/i18n'

const tr = translations.en

test('restores from a metal-plate prefix by autocompleting each BIP39 word after four letters', async ({ page }) => {
  await page.goto('/')
  await page.getByText(tr.init.otherLoginOptions).click()
  await page.getByText(tr.init.restoreWallet).click()

  const input = page.locator('input[name="private-key"]')
  await input.click()
  await input.pressSequentially('aban')
  await expect(input).toHaveValue('abandon ')

  await input.pressSequentially('abou')
  await expect(input).toHaveValue('abandon about ')
})
