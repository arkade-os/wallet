import type { Page } from '@playwright/test'
import { test, expect, createWallet, enableAssets, fundWallet, mintAsset, navigateToAssets } from './utils'

/**
 * The peer-to-peer order book, through the UI.
 *
 * One thing beyond the usual regtest stack decides what can run here, and it is
 * detected rather than assumed — a book test that passes with no book is worse
 * than one that says why it could not run.
 *
 * `readBook` recognises a resting order by the covenant co-signer named in its
 * offer packet, so the whole book stays dark until this network has one. regtest
 * pins none — every local stack mints its own — so the provider reads it from
 * the emulator's /v1/info instead, http://localhost:7073 on the arkade-regtest
 * stack. With neither a pin nor a reachable emulator the ladder is a skeleton
 * forever and nothing posted is ever seen again.
 *
 * The stream is also the ONLY source of other people's orders: it is live-only,
 * with no backfill, so a wallet sees what is posted while it is open and its own
 * cache, and nothing else. That is why the last test rests its order from a
 * second wallet in a second context, with the wallet under test already
 * watching, rather than seeding the chain beforehand.
 *
 * The assertion this file exists for is that last one, on the outlook line in
 * TradeSheet: it used to print `fills now` whenever the typed price crossed the
 * book. Crossing is not enough — a fill is all-or-nothing, so a resting row also
 * has to carry EXACTLY the size being asked for, or the order rests next to the
 * one it was meant to take.
 */

const NO_STREAM =
  'the order book stream never started — this network has no covenant co-signer: nothing pinned, and no emulator answering /v1/info (regtest expects one on http://localhost:7073, or set VITE_EMULATOR_PUBKEY)'

const NO_TAKE =
  'the ladder disables every row where the deployment cannot submit a fill (takeable=false), pulls included — this network has no emulator endpoint, so set VITE_EMULATOR_URL'

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

/** 100 TST at 50 sats each, from the asset page. Nothing rests on a pair this
 * new, so the order can only rest — which is what makes it ours to pull. */
async function postOrder(page: Page, side: 'Buy' | 'Sell'): Promise<void> {
  await page.getByText(side, { exact: true }).click()
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

  await postOrder(page, 'Buy')

  // the row arrives off the global tx stream, exactly like anyone else's would
  await expect(page.getByText('yours')).toBeVisible({ timeout: 90000 })
  await expect(page.getByRole('button', { name: /^pull 100 TST at 50/ })).toBeVisible()
  await expect(page.getByText('no orders yet')).toHaveCount(0)

  // an asset with a resting order is a market, and markets get the grid — the
  // card is matched by ticker so a book seeded elsewhere cannot satisfy this
  await page.getByLabel('Go back').click()
  await expect(page.getByText('markets', { exact: true })).toBeVisible()
  await expect(page.getByTestId(/^market-card-/).filter({ hasText: 'TST' })).toBeVisible()
})

test('pulling a resting order takes it out of the ladder', async ({ page }) => {
  test.setTimeout(240000)
  await mintAndOpen(page)
  test.skip(!(await bookStreamStarted(page)), NO_STREAM)

  await postOrder(page, 'Buy')

  const row = page.getByRole('button', { name: /^pull 100 TST at 50/ })
  await expect(row).toBeVisible({ timeout: 90000 })
  test.skip(!(await row.isEnabled()), NO_TAKE)

  await row.click()

  // The refund lands as an ordinary incoming payment, whose success splash takes
  // the screen off the asset page — so the ladder is re-read from a fresh
  // render. Asserting the row is gone in place would also pass on a screen that
  // merely navigated away, which is the same evidence for a very different fact.
  const splash = page.getByRole('button', { name: /Sounds good|Tap to go home/ })
  await splash
    .waitFor({ state: 'visible', timeout: 30000 })
    .then(() => splash.click())
    .catch(() => {})
  await navigateToAssets(page)
  await page.getByTestId(/^asset-row-TST-/).click()
  await expect(page.getByText('no orders yet')).toBeVisible({ timeout: 60000 })
  await expect(page.getByText('yours')).toHaveCount(0)
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

test('a crossing price fills only at the exact resting size, and says so either way', async ({ page, browser }) => {
  test.setTimeout(300000)

  // The wallet under test holds nothing and only watches. It opens FIRST: the
  // book is a live stream with no backfill, so an order posted before this page
  // existed would never reach it.
  await createWallet(page)
  await enableAssets(page)
  await navigateToAssets(page)

  // The maker is a second wallet in its own context, because `matchFor` excludes
  // your own orders — a wallet cannot build a book it is allowed to trade
  // against, so the row has to come from somebody else.
  const makerContext = await browser.newContext()
  const maker = await makerContext.newPage()
  try {
    await mintAndOpen(maker)
    test.skip(!(await bookStreamStarted(maker)), NO_STREAM)
    await postOrder(maker, 'Sell')
    await expect(maker.getByText('yours')).toBeVisible({ timeout: 90000 })

    // 100 TST at 50 sats now rests on a pair the watching wallet does not hold,
    // so it reaches it the only way anyone reaches a stranger's market
    const card = page.getByTestId(/^market-card-/).filter({ hasText: 'TST' })
    await expect(card).toBeVisible({ timeout: 90000 })
    await card.click()
    await expect(page.getByText('no orders yet')).toHaveCount(0)

    await page.getByText('Buy', { exact: true }).click()
    await expect(page.getByTestId('trade-sheet')).toBeVisible()
    // the sheet opens on the best ask, so the price crosses by construction
    await expect(page.getByTestId('trade-price')).toHaveValue('50')

    // 7 against a rung of 100: crossing on price with a size nothing matches is
    // the exact case that used to read `fills now` while the code posted a
    // resting order instead. A fill is all-or-nothing, so this one waits.
    await page.getByTestId('trade-amount').fill('7')
    await expect(page.getByText(/no resting order is exactly 7 TST/)).toBeVisible()
    await expect(page.getByText('fills now')).toHaveCount(0)

    // and the control: at the size the row actually carries, it does fill
    await page.getByTestId('trade-amount').fill('100')
    await expect(page.getByText('fills now')).toBeVisible()
  } finally {
    await makerContext.close()
  }
})
