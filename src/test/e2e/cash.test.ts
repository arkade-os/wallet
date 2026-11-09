import { test, expect, createWallet, fundWallet, navigateHome } from './utils'
import { mkdir, writeFile } from 'node:fs/promises'

const seedRegtestRegistries = async () => {
  const dirs = ['public/asset-registry', 'public/solver-registry']
  await Promise.all(dirs.map((dir) => mkdir(dir, { recursive: true })))
  const files = [
    ['public/asset-registry/regtest.json', '[]'],
    [
      'public/solver-registry/regtest.json',
      JSON.stringify({
        version: 0,
        network: 'regtest',
        generated_at: 0,
        commit: 'a'.repeat(40),
        markets: [],
      }),
    ],
  ] as const
  await Promise.all(
    files.map(async ([path, contents]) => {
      if (path.endsWith('regtest.json')) await writeFile(path, contents)
    }),
  )
}

test('issues, reveals, claims and links a Cash voucher in activity', async ({ page }) => {
  test.setTimeout(120_000)
  await seedRegtestRegistries()
  await createWallet(page)
  await fundWallet(page, 20_000)

  const issues = page.getByRole('button', { name: 'Issue voucher' })
  await page.getByTestId('home-action-cash').click()
  await issues.first().click()
  await page.getByRole('textbox').fill('5000')
  await issues.last().click()

  await expect(page.getByText('5,000 sats')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText('Unclaimed')).toBeVisible()
  await page.getByRole('button', { name: 'View voucher' }).click()
  const token = (await page.getByText(/t?arkadecash1/).innerText()).trim()
  expect(token).toMatch(/^t?arkadecash1/)

  await page.getByText('Back to vouchers').click()
  await page.getByRole('button', { name: 'Claim voucher' }).first().click()
  await page.getByRole('textbox').fill(token)
  await page.getByRole('button', { name: 'Claim voucher' }).last().click()
  await expect(page.getByText('Claimed')).toBeVisible({ timeout: 60_000 })

  await navigateHome(page)
  await page.getByTestId('top-right-activity').or(page.getByTestId('desktop-nav-activity')).first().click()
  await expect(page.getByText('Cash issued').first()).toBeVisible()
  await page.getByText('Cash issued').first().click()
  await expect(page.getByText('You issued this voucher')).toBeVisible()
})
