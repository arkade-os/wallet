import { existsSync, readFileSync } from 'fs'
import type { Page } from '@playwright/test'
import { test, expect, createWallet, enableAssets, fundWallet, mintAsset, navigateToAssets } from './utils'

/**
 * The peer-to-peer order book, through the UI.
 *
 * Two things beyond the usual regtest stack decide what can run here, and both
 * are detected rather than assumed — a book test that passes with no book is
 * worse than one that says why it could not run.
 *
 *   1. THE STREAM. `readBook` recognises a resting order by the covenant
 *      co-signer named in its offer packet, so the whole book is dark until the
 *      network has one configured. regtest pins none (every local stack
 *      generates its own), which means the dev server needs
 *      VITE_EMULATOR_PUBKEY — the `signerPubkey` from the emulator's /v1/info,
 *      http://localhost:7073 on the arkade-regtest stack. Without it the ladder
 *      is a skeleton forever and nothing posted is ever seen again.
 *
 *   2. A ROW THIS WALLET DOES NOT OWN. `matchFor` excludes your own orders, so
 *      a wallet cannot build a book it can honestly trade against. `pnpm
 *      seed:book` rests one from its own key; its output file is read below.
 *
 * The assertion this file exists for is the outlook line in TradeSheet, which
 * used to print `fills now` whenever the typed price crossed the book. Crossing
 * is not enough: a fill is all-or-nothing, so a resting row also has to carry
 * EXACTLY the size being asked for, or the order rests next to the one it was
 * meant to take. Both `waits` cases below are asserted on the visible text.
 */

const SEED_PATH = process.env.SEED_BOOK_PATH ?? 'scripts/.seeded-book.json'
const seeded = existsSync(SEED_PATH) ? JSON.parse(readFileSync(SEED_PATH, 'utf8')) : null

const NO_STREAM =
  'the order book stream never started — regtest pins no covenant co-signer, so the dev server needs VITE_EMULATOR_PUBKEY (the emulator signerPubkey from http://localhost:7073/v1/info)'

const NO_TAKE =
  'the ladder disables every row when the deployment cannot submit a fill (takeable=false), pulls included — set VITE_EMULATOR_URL to reach the regtest emulator'

/** The ladder renders a skeleton until the provider reports `ready`, which only
 * happens once the tx stream is running. Detached skeleton = live book. */
async function bookStreamStarted(page: Page): Promise<boolean> {
  return page
    .getByTestId('book-ladder-skeleton')
    .waitFor({ state: 'detached', timeout: 20000 })
    .then(() => true)
    .catch(() => false)
}

/** A funded wallet holding 1000 TST, parked on that asset's page. */
async function mintAndOpen(page: Page): Promise<void> {
  await createWallet(page)
  await fundWallet(page, 20000)
  await enableAssets(page)
  await mintAsset(page, { amount: '1000', name: 'BookCoin', ticker: 'TST', decimals: 0 })
  await page.getByText('Back to Arkade Mint').click()
  await page.getByTestId(/^asset-row-TST-/).click()
  await expect(page.getByText('Buy', { exact: true })).toBeVisible()
}

/** Post a bid: 100 TST at 50 sats each. Nothing rests on this pair, so it can
 * only rest — which is what makes it ours to pull afterwards. */
async function postBid(page: Page): Promise<void> {
  await page.getByText('Buy', { exact: true }).click()
  await expect(page.getByTestId('trade-sheet')).toBeVisible()
  await page.getByTestId('trade-amount').fill('100')
  await page.getByTestId('trade-price').fill('50')
  await page.getByTestId('trade-submit').click()
  // funding the covenant is an ordinary send, so the sheet stays up for it
  await expect(page.getByTestId('trade-sheet')).toBeHidden({ timeout: 90000 })
}

test('the markets screen renders and a minted asset is reachable from it', async ({ page }) => {
  test.setTimeout(120000)
  await createWallet(page)
  await fundWallet(page)
  await enableAssets(page)
  await mintAsset(page, { amount: '1000', name: 'BookCoin', ticker: 'TST', decimals: 0 })

  await page.getByText('Back to Arkade Mint').click()

  await expect(page.getByText('Arkade Mint').first()).toBeVisible()
  // A just-minted asset has no resting order, so it is not a market yet: it
  // lands under "your assets", and enters the grid when an order rests on it —
  // which is what the posting test asserts.
  await expect(page.getByTestId(/^asset-row-TST-/)).toBeVisible()
})

test('the asset page leads with the market', async ({ page }) => {
  test.setTimeout(120000)
  await mintAndOpen(page)

  for (const label of ['Price', 'Spread', 'Best bid', 'Supply']) {
    await expect(page.getByText(label, { exact: true })).toBeVisible()
  }
  // nothing has ever been quoted on a pair this new
  await expect(page.getByText('no book')).toBeVisible()

  test.skip(!(await bookStreamStarted(page)), NO_STREAM)
  await expect(page.getByText('no orders yet')).toBeVisible()
})

test('a posted order rests in the ladder as yours, and makes the asset a market', async ({ page }) => {
  test.setTimeout(240000)
  await mintAndOpen(page)
  test.skip(!(await bookStreamStarted(page)), NO_STREAM)

  await postBid(page)

  // the row arrives off the global tx stream, exactly like anyone else's would
  await expect(page.getByText('yours')).toBeVisible({ timeout: 90000 })
  await expect(page.getByRole('button', { name: /^pull 100 TST at 50/ })).toBeVisible()
  await expect(page.getByText('no orders yet')).toHaveCount(0)

  // an asset with a resting order is a market, and markets get the grid
  await page.getByLabel('Go back').click()
  await expect(page.getByText('markets', { exact: true })).toBeVisible()
  await expect(page.getByTestId(/^market-card-/).first()).toBeVisible()
})

test('pulling a resting order takes it out of the ladder', async ({ page }) => {
  test.setTimeout(240000)
  await mintAndOpen(page)
  test.skip(!(await bookStreamStarted(page)), NO_STREAM)

  await postBid(page)

  const row = page.getByRole('button', { name: /^pull 100 TST at 50/ })
  await expect(row).toBeVisible({ timeout: 90000 })
  test.skip(!(await row.isEnabled()), NO_TAKE)

  await row.click()
  await expect(page.getByText('yours')).toHaveCount(0, { timeout: 90000 })
  await expect(page.getByText('no orders yet')).toBeVisible()
})

test('the outlook never claims a fill when there is no book', async ({ page }) => {
  test.setTimeout(120000)
  await mintAndOpen(page)

  await page.getByText('Buy', { exact: true }).click()
  await expect(page.getByTestId('trade-sheet')).toBeVisible()
  await page.getByTestId('trade-amount').fill('100')
  await page.getByTestId('trade-price').fill('50')

  // nothing rests here, so there is nothing to cross and nothing to fill
  await expect(page.getByText('waits until someone takes it')).toBeVisible()
  await expect(page.getByText('fills now')).toHaveCount(0)
})

test.describe('against a book this wallet does not own', () => {
  test.skip(!seeded, `no seeded book at ${SEED_PATH} — run \`pnpm seed:book\` against the regtest stack`)

  test('a crossing price with a size no rung carries waits, and names the mismatch', async ({ page }) => {
    test.setTimeout(120000)
    await createWallet(page)
    await enableAssets(page)
    await navigateToAssets(page)

    // the seeded pair is a market without this wallet holding any of it
    const card = page.getByTestId(`market-card-${seeded.assetId}`)
    const listed = await card
      .waitFor({ state: 'visible', timeout: 30000 })
      .then(() => true)
      .catch(() => false)
    test.skip(!listed, NO_STREAM)

    await card.click()
    await expect(page.getByText('no orders yet')).toHaveCount(0)

    await page.getByText('Buy', { exact: true }).click()
    await expect(page.getByTestId('trade-sheet')).toBeVisible()
    // the sheet opens on the best ask, so the price crosses by construction
    await expect(page.getByTestId('trade-price')).not.toHaveValue('')

    // 7 tokens: the seeder rests whole hundreds per rung, so no row carries it.
    // Crossing on price with a size nothing matches is the exact case that used
    // to read `fills now` while the code posted a resting order instead.
    await page.getByTestId('trade-amount').fill('7')
    await expect(page.getByText(/no resting order is exactly 7/)).toBeVisible()
    await expect(page.getByText('fills now')).toHaveCount(0)
  })
})
