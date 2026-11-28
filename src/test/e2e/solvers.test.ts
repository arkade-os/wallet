import { test, expect, createWallet, navigateToSettings, mockSolverCard } from './utils'
import { translations } from '../../lib/i18n'

const tr = translations.en

test('should add and remove a solver card from settings', async ({ page }) => {
  test.setTimeout(10_000)
  await createWallet(page)

  await navigateToSettings(page)
  await page.getByText(tr.settings.advanced, { exact: true }).click()
  await page.getByText(tr.settings.solvers, { exact: true }).click()
  await page.getByRole('tab', { name: tr.solvers.cardsTab, exact: true }).click()

  const storedCard = page.getByTestId('stored-solver-card')
  await expect(storedCard).toHaveCount(0)

  await page.getByRole('button', { name: tr.solvers.addNew }).click()
  await page.locator('textarea').fill(JSON.stringify(mockSolverCard))
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(storedCard).toHaveCount(1)
  await expect(storedCard.getByText(mockSolverCard.name, { exact: true })).toBeVisible()

  const availability = storedCard.getByRole('switch')
  await expect(availability).toBeChecked()
  await availability.click()
  await expect(availability).not.toBeChecked()
  await expect(storedCard).toHaveCount(1)
  await page.getByRole('tab', { name: tr.solvers.priorityTab, exact: true }).click()
  await page.getByRole('tab', { name: tr.solvers.cardsTab, exact: true }).click()
  await expect(availability).not.toBeChecked()
  await availability.click()
  await expect(availability).toBeChecked()

  await page.getByRole('button', { name: 'Remove' }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Remove' }).click()

  await expect(storedCard).toHaveCount(0)
})

test('should show an error when adding an invalid solver card', async ({ page }) => {
  test.setTimeout(10_000)
  await createWallet(page)

  await navigateToSettings(page)
  await page.getByText(tr.settings.advanced, { exact: true }).click()
  await page.getByText(tr.settings.solvers, { exact: true }).click()
  await page.getByRole('tab', { name: tr.solvers.cardsTab, exact: true }).click()

  await expect(page.getByTestId('stored-solver-card')).toHaveCount(0)

  // remove the last character to make it invalid JSON
  await page.getByRole('button', { name: tr.solvers.addNew }).click()
  await page.locator('textarea').fill(JSON.stringify(mockSolverCard).slice(0, -1))
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText(/invalid JSON:/)).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()

  // use an invalid version number
  await page.getByRole('button', { name: tr.solvers.addNew }).click()
  await page.locator('textarea').fill(JSON.stringify({ ...mockSolverCard, version: 2 }))
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText(/invalid card:/)).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
})
test('should show solver card info in the detail view', async ({ page }) => {
  test.setTimeout(10_000)
  await createWallet(page)

  await navigateToSettings(page)
  await page.getByText(tr.settings.advanced, { exact: true }).click()
  await page.getByText(tr.settings.solvers, { exact: true }).click()
  await page.getByRole('tab', { name: tr.solvers.cardsTab, exact: true }).click()

  await page.getByRole('button', { name: tr.solvers.addNew }).click()
  await page.locator('textarea').fill(JSON.stringify(mockSolverCard))
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByTestId('stored-solver-card').getByText(mockSolverCard.name, { exact: true })).toBeVisible()
  await page
    .getByTestId('stored-solver-card')
    .getByRole('button', { name: tr.solvers.viewInfo.replace('{name}', mockSolverCard.name) })
    .click()
  await expect(page.getByText(tr.solvers.cardInfo)).toBeVisible()
})
