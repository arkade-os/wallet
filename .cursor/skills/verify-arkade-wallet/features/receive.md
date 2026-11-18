# Receive

Show a code someone can pay, in the format their wallet needs.

## Sub-features

- The QR code, in a white card in both themes. Tapping it copies what it encodes. It carries no logo.
- Default format **Unified**: one `bitcoin:` URI holding the onchain address, the Arkade address and, once an
  amount is set and Lightning is available, an invoice.
- **Other formats**: a sheet with one radio group. Formats (Unified, Lightning, Arkade, Bitcoin) and, when
  the server offers them for the amount, stablecoins. Picking one closes the sheet and the row then reads
  "Showing …". Lightning stays out of sight until someone asks for it here.
- **Add amount** / **Edit amount**: a keypad on phones, a field in a sheet on desktop. The amount then leads
  the screen as a figure. Clearing it is offered once one is set.
- **Copy**: copies the shown value, or opens a sheet of addresses when Unified holds several.
- **Share**: the system share sheet, where the browser has one.
- Lightning address panel, when a name is claimed or can be.
- Arrival: the screen moves to the received sheet by itself when a payment lands.

## How to get to it (user POV)

Home → **Receive**. The screen rises from the bottom and closes with the X at the top left.

## Driving it with Playwright

`node .cursor/skills/verify-arkade-wallet/scripts/drive.cjs receive [--theme=dark] [--viewport=desktop]`

- Open: `home-action-receive`, then `header-title-receive`. Close: `header-back-btn` (labelled "Close").
- Code: `getByRole('button', { name: 'Copy QR code' })`. Wait until it is enabled.
- Formats: `getByTestId('receive-formats')`, then `getByRole('radiogroup')` and its `radio` rows. Stablecoins
  sit in `getByRole('group', { name: 'Pay with stablecoins' })`.
- Amount: `getByRole('button', { name: 'Add amount' })`, keys `keyboard-0`…`keyboard-9`, `save-amount`; on
  desktop `input[name="receive-amount-sheet"]` and `button "Set amount"`. Result: `receive-amount`.

Proof is the clipboard. After tapping the code on Unified it holds a `bitcoin:` URI with an `ark=` parameter.
After picking Arkade it holds a bare `tark1…` (test networks) or `ark1…` address, and the row says so.

## Gotchas

- With a fiat display currency the keypad enters cents from the right, so `1`,`0`,`0`,`0` is 10.00, not 1000.
  The desktop field takes whole units instead, so the same journey requests 1,000.00 there, which is outside
  the test server's Lightning bounds and shows a "Lightning unavailable" notice. Both are expected.
- Right after an amount is set, the code is replaced by a loader while an invoice is negotiated, and Copy is
  disabled until it returns. On the test server this can take a few seconds or fail with a notice above the
  code; the rest of the screen keeps working.
- The "Copied to clipboard" toast sits over the header title for two seconds. It is in the screenshots.
- Headless browsers have no share sheet, so Share is disabled there. That is the environment.
- Not driven: an actual incoming payment (needs a payer, so regtest), the Lightning address panel, stablecoin
  quotes, and the asset detail entry point.
