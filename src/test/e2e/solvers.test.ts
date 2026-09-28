import { test, expect, createWallet, navigateToSettings, mockSolverCard } from './utils'
import { translations } from '../../lib/i18n'

const tr = translations.en

test('should add and remove a solver card from settings', async ({ page }) => {
  test.setTimeout(10_000)
  await createWallet(page)

  await navigateToSettings(page)
  await page.getByText(tr.settings.advanced, { exact: true }).click()
  await page.getByText(tr.settings.solvers, { exact: true }).click()

  const noSolverCardsMessage = tr.solvers.storedPlural.replace('{count}', 'no')
  await expect(page.getByText(noSolverCardsMessage)).toBeVisible()

  await page.getByRole('button', { name: '+ Add new' }).click()
  await page.locator('textarea').fill(JSON.stringify(mockSolverCard))
  await page.getByRole('button', { name: 'Save' }).click()

  const oneSolverCardMessage = tr.solvers.storedSingular.replace('{count}', '1')
  await expect(page.getByText(oneSolverCardMessage)).toBeVisible()
  await expect(page.getByText(mockSolverCard.name)).toBeVisible()

  await page.getByRole('button', { name: 'Remove' }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Remove' }).click()

  await expect(page.getByText(noSolverCardsMessage)).toBeVisible()
})

test('should show an error when adding an invalid solver card', async ({ page }) => {
  test.setTimeout(10_000)
  await createWallet(page)

  await navigateToSettings(page)
  await page.getByText(tr.settings.advanced, { exact: true }).click()
  await page.getByText(tr.settings.solvers, { exact: true }).click()

  const noSolverCardsMessage = tr.solvers.storedPlural.replace('{count}', 'no')
  await expect(page.getByText(noSolverCardsMessage)).toBeVisible()

  // remove the last character to make it invalid JSON
  await page.getByRole('button', { name: '+ Add new' }).click()
  await page.locator('textarea').fill(JSON.stringify(mockSolverCard).slice(0, -1))
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText(/invalid JSON:/)).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()

  // use a invalid version number
  await page.getByRole('button', { name: '+ Add new' }).click()
  await page.locator('textarea').fill(JSON.stringify({ ...mockSolverCard, version: 21 }))
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText(/invalid card:/)).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
})
