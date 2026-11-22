import { existsSync, readFileSync } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import { test, expect, createWallet, fundWallet, prePay, addInvoiceFromLND } from './utils'
import { translations } from '../../lib/i18n'

const execAsync = promisify(exec)
const tr = translations.en

/**
 * The RFQ Lightning send, end to end against a real solver.
 *
 * Nothing here is simulated: the wallet negotiates a quote over Nostr with
 * `arkade-os/lightning-swap-service`, derives the lockup covenant itself,
 * refuses to fund an address it did not derive, and pays with an ordinary Ark
 * send. The solver then pays the BOLT11 across a real channel between the
 * stack's two LND nodes and claims the covenant with the preimage.
 *
 * Check settlement on the receiving LND node and on the wallet receipt.
 *
 * Setup — see the header of `.env.regtest` and docs/e2e-lightning.md:
 *   1. `pnpm regtest:start` with ARKD_UNILATERAL_EXIT_DELAY=1024
 *   2. the swap service running `cli relay` against ws://localhost:7777
 *   3. its `cli card` output saved to .regtest-lightning.card.json
 * The card is deployment-specific (its `discovery_pubkey` is the solver's own
 * key), so it is generated rather than committed, and the test skips loudly
 * when it is missing instead of failing as though the wallet were broken.
 */
const CARD_PATH = process.env.LN_SOLVER_CARD_PATH ?? '.regtest-lightning.card.json'
const card = existsSync(CARD_PATH) ? JSON.parse(readFileSync(CARD_PATH, 'utf8')) : null

/** `hash` is lncli's `r_hash`, already hex — which is what lookupinvoice takes. */
const invoiceState = async (paymentHash: string): Promise<string> => {
  const { stdout } = await execAsync(`docker exec lnd lncli --network=regtest lookupinvoice ${paymentHash}`)
  return JSON.parse(stdout).state
}

test.describe('RFQ Lightning send', () => {
  test.skip(!card, `no solver card at ${CARD_PATH} — start the swap service and run its \`cli card\``)

  test('pays a BOLT11 invoice through the Arkade RFQ solver', async ({ page }) => {
    test.setTimeout(180_000)

    // The card is the ONLY thing that makes the corridor exist: it carries the
    // solver's pubkey and relays, and there is no URL to configure instead.
    // Injected before any app script runs, so the markets cache is written
    // with the card already present rather than without it.
    await page.addInitScript((localCard) => {
      localStorage.setItem(
        'solverCards',
        JSON.stringify([{ network: 'regtest', label: 'regtest-lightning', card: localCard }]),
      )
    }, card)

    await createWallet(page)
    await fundWallet(page, 20_000)

    // 2000 sats: inside the card's quote-side bounds and clear of the dust floor.
    const { invoice, hash } = await addInvoiceFromLND(2000)
    expect(await invoiceState(hash)).toBe('OPEN')

    // No amount: a BOLT11 fixes it, and the form makes the field read-only.
    await prePay(page, invoice)

    await expect(page.getByTestId('primary-amount')).toHaveText('2,000 sats')
    await page.getByRole('button', { name: tr.send.pay, exact: true }).click({ timeout: 60_000 })
    await expect(page.getByRole('button', { name: tr.send.viewPaymentActivity })).toBeVisible({ timeout: 60_000 })

    // The solver still has to notice the funding, pay and claim. It took ~2.5s
    // by hand; poll so a slow round doesn't make this flaky.
    await expect.poll(() => invoiceState(hash), { timeout: 90_000, intervals: [1000] }).toBe('SETTLED')
    await expect(page.getByRole('heading', { name: tr.send.paymentSent, exact: true })).toBeVisible({ timeout: 30_000 })
  })
})
