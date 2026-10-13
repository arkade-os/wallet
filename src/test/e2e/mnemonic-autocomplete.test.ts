import { test, expect } from './utils'
import { translations } from '../../lib/i18n'

const tr = translations.en

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.getByText(tr.init.otherLoginOptions).click()
  await page.getByText(tr.init.restoreWallet).click()
})

test('suggests recovery words without rewriting typed prefixes or showing premature errors', async ({ page }) => {
  const input = page.getByRole('combobox', { name: tr.components.recoveryPhraseOrKey })
  await input.pressSequentially('ah')
  await expect(input).toHaveValue('ah')
  await expect(input).toHaveAttribute('aria-invalid', 'false')
  await page.getByRole('option', { name: 'ahead', exact: true }).click()
  await expect(input).toHaveValue('ahead ')
  await expect(input).toBeFocused()

  await input.pressSequentially('agr')
  await input.press('ArrowDown')
  await input.press('Enter')
  await expect(input).toHaveValue('ahead agree ')
  await expect(input).toHaveAttribute('aria-invalid', 'false')

  await input.pressSequentially('aban')
  await expect(input).toHaveValue('ahead agree aban')
  await page.getByRole('option', { name: 'abandon', exact: true }).click()
  await expect(input).toHaveValue('ahead agree abandon ')
  await page.getByRole('button', { name: tr.common.continue, exact: true }).click()
  await expect(page.getByText(tr.init.recoveryWordCountError)).toBeVisible()
})

test('preserves manual hex entry and reports finished-word errors with a stable Continue label', async ({ page }) => {
  const input = page.getByRole('combobox', { name: tr.components.recoveryPhraseOrKey })
  const key = 'abadef' + 'a'.repeat(58)
  await input.pressSequentially(key)
  await expect(input).toHaveValue(key)
  await expect(page.getByRole('option')).toHaveCount(0)

  await input.fill('abnadon')
  await expect(input).toHaveAttribute('aria-invalid', 'false')
  await input.press('Space')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await input.fill('abandon ')
  await expect(input).toHaveAttribute('aria-invalid', 'false')
  await expect(page.getByRole('button', { name: tr.common.continue, exact: true })).toBeEnabled()
})
