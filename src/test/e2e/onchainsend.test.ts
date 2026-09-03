import { existsSync, readFileSync } from 'fs'
import { execSync } from 'child_process'
import { test, expect, createWallet, fundWallet, prePay, dismissPaymentSuccess } from './utils'

/**
 * Sending to an L1 address, end to end: through a solver when one can serve the
 * amount, through the collaborative exit when none can.
 *
 * The two halves are tested differently on purpose.
 *
 * **The fallback runs everywhere**, against nothing but the regtest stack. It
 * has to: it is the path every wallet without a matching card takes, it is what
 * this repo already shipped, and the one regression this change could cause is
 * breaking it. The card injected below advertises the corridor and refuses the
 * size, which is the case that is easy to get wrong in the opposite direction —
 * a wallet that quoted anyway would burn a negotiation and leak the trade for
 * an answer the card already gave.
 *
 * **The solver route needs a solver**, and there is no
 * `arkade:BTC -> onchain:BTC` service in this stack. It follows `lnsend.test.ts`
 * exactly: the card is deployment-specific (its `discovery_pubkey` is the
 * solver's own key) so it is generated rather than committed, and the test skips
 * loudly when it is missing instead of failing as though the wallet were broken.
 *
 *   1. `pnpm regtest:start`
 *   2. arkade-os/lightning-swap-service running `cli relay` with
 *      ONCHAIN_SEND_ENABLED=true against ws://localhost:10547
 *   3. its `cli card` output saved to .regtest-onchain.card.json
 *
 * The assertions read the wallet's OWN log (Settings -> Logs, backed by
 * localStorage) because a routing decision has no other trace: a send that fell
 * back looks on screen exactly like a send that was never going to be routed.
 * That invisibility is precisely what the log exists to fix, so asserting on it
 * is asserting on the feature rather than around it.
 */
const ONCHAIN_ADDRESS = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'

/** The routing decisions the wallet recorded, oldest first. */
const routeLog = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    (JSON.parse(localStorage.getItem('logs') ?? '[]') as { msg: string }[])
      .map((line) => line.msg)
      .filter((msg) => msg.startsWith('onchain send:')),
  )

/** Put solver cards in place before any app script runs, so the markets cache
 * is built with them rather than without. */
const withCards = (page: import('@playwright/test').Page, cards: unknown[]) =>
  page.addInitScript((stored) => localStorage.setItem('solverCards', JSON.stringify(stored)), cards)

/**
 * A regtest card serving `arkade:BTC -> onchain:BTC` between `min` and `max`.
 *
 * `emulator_pubkey` is absent so the wallet's per-network pin supplies the
 * covenant co-signer, which is the same resolution the Lightning corridor uses.
 * Nothing here has to be a real solver: every assertion below is about a
 * decision the wallet reaches BEFORE it addresses one.
 */
const onchainCard = (min: string, max: string) => ({
  version: 0,
  name: 'regtest-onchain-bounds',
  discovery_pubkey: 'b'.repeat(64),
  transports: { nostr: { relays: ['wss://localhost:10548'] } },
  markets: [
    {
      pair: 'BTC/onchain:BTC',
      base_asset: { id: 'btc', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
      quote_asset: { id: 'btc', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
      base_corridor: 'arkade',
      quote_corridor: 'onchain',
      fee_bps: 10,
      min_base_amount: min,
      max_base_amount: max,
      min_quote_amount: min,
      max_quote_amount: max,
    },
  ],
})

test.describe('sending onchain', () => {
  test('falls back to a collaborative exit when no card can take the amount', async ({ page, isMobile }) => {
    test.setTimeout(120_000)
    // The onchain-output fee has to be non-zero for the exit to be the exit
    // this wallet actually performs; `send.test.ts` sets it the same way.
    execSync('docker exec -t arkd arkd fees intent --onchain-output "200.0"')

    try {
      // Serves the pair, and only in millions of sats. A wallet that checked
      // the pair without the size would negotiate against this card.
      await withCards(page, [{ network: 'regtest', label: 'too-big', card: onchainCard('1000000', '2000000') }])

      await createWallet(page)
      await fundWallet(page, 1800)
      await prePay(page, ONCHAIN_ADDRESS, isMobile, 900)

      // The exit still happens, unchanged, and the reason it was an exit is on
      // the record. `amount_out_of_bounds` rather than `no_solver` is the whole
      // point: the card WAS found, and rejected on size alone.
      await page.getByText('Tap to Sign').click({ timeout: 60_000 })
      await page.waitForSelector('text=Payment sent', { timeout: 60_000 })

      const log = await routeLog(page)
      expect(log.at(-1)).toContain('collaborative exit (amount_out_of_bounds)')

      await dismissPaymentSuccess(page)
      await page.waitForSelector('text=Sent', { timeout: 20_000 })
    } finally {
      execSync('docker exec -t arkd arkd fees clear')
    }
  })

  test('falls back, and says so, when no card serves the corridor at all', async ({ page, isMobile }) => {
    test.setTimeout(120_000)
    execSync('docker exec -t arkd arkd fees intent --onchain-output "200.0"')

    try {
      // The shipping default: a wallet with no onchain-send card. This must
      // behave exactly as it did before the solver route existed.
      await createWallet(page)
      await fundWallet(page, 1800)
      await prePay(page, ONCHAIN_ADDRESS, isMobile, 900)

      await page.getByText('Tap to Sign').click({ timeout: 60_000 })
      await page.waitForSelector('text=Payment sent', { timeout: 60_000 })

      const log = await routeLog(page)
      expect(log.at(-1)).toContain('collaborative exit (no_solver)')
    } finally {
      execSync('docker exec -t arkd arkd fees clear')
    }
  })
})

const CARD_PATH = process.env.ONCHAIN_SOLVER_CARD_PATH ?? '.regtest-onchain.card.json'
const solverCard = existsSync(CARD_PATH) ? JSON.parse(readFileSync(CARD_PATH, 'utf8')) : null

test.describe('sending onchain through a solver', () => {
  test.skip(
    !solverCard,
    `no onchain solver card at ${CARD_PATH} — start the swap service with ONCHAIN_SEND_ENABLED=true and run its \`cli card\``,
  )

  test('routes the exit through the solver that quoted it', async ({ page, isMobile }) => {
    test.setTimeout(180_000)
    await withCards(page, [{ network: 'regtest', label: 'regtest-onchain', card: solverCard }])

    await createWallet(page)
    await fundWallet(page, 50_000)
    await prePay(page, ONCHAIN_ADDRESS, isMobile, 20_000)

    // Reaching the sign screen with a quote in hand already means the solver
    // answered and the wallet accepted its lockup address as matching its own
    // derivation — the client refuses to return a mismatched one.
    await page.getByText('Tap to Sign').click({ timeout: 60_000 })
    await page.getByTestId('loading-logo').waitFor({ timeout: 30_000 })
    await page.waitForSelector('text=Payment sent', { timeout: 60_000 })

    const log = await routeLog(page)
    expect(log.at(-1)).toContain('solver route')
    expect(log.join(' ')).not.toContain('collaborative exit')
  })
})
