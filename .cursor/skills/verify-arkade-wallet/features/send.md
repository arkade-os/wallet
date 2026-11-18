# Send

Pay an address, invoice or name: recipient, amount, review, sign.

## Sub-features

- Recipient: paste, type or scan. Accepts Arkade and Bitcoin addresses, `bitcoin:` URIs, Lightning invoices,
  LNURL and Lightning addresses. Recipients get a 3×3 pattern derived from the address, so a wrong paste
  looks wrong.
- Amount: on phones the keypad opens by itself once the recipient resolves. A toggle switches between the
  display currency and Bitcoin units, and going over the balance says so. **Max** closes the keypad and
  applies the form's Max, which takes a rail's fee out of the amount and asks about the reserve; the form's
  Continue then goes to review. The keypad's own button reads Continue and goes straight to review.
- Review: a sheet over the amount with recipient, amount, fees and total, **Tap to Sign** and Cancel.
- Sending: the button becomes a progress row in place. Nothing navigates, the sheet cannot be dismissed,
  Escape does nothing and the desktop sidebar is inert. Browser Back still leaves: the payment carries on
  and its result arrives as a toast and a row in Activity.
- Success: the same sheet shows a drawn check, what happened, and **Sounds good**, which returns Home.
- Afterwards the row in Recent activity reads Sent, whichever rail carried the payment.

## How to get to it (user POV)

Home → **Send**. The screen rises from the bottom and closes with the X. Scanning a code from the Home header
lands on the same form with the recipient filled.

## Driving it with Playwright

`node .cursor/skills/verify-arkade-wallet/scripts/drive.cjs send`

- Open: `home-action-send`. Recipient: `[name="send-address"]`.
- Amount, phone: wait for `save-amount` (the keypad opening by itself means the recipient resolved), then
  `keyboard-0`…`keyboard-9` and `save-amount`, or `keyboard-max` followed by the form's `button "Continue"`.
  Desktop: `[name="send-amount"]` or `input-amount-max`, then `button "Continue"`.
- Review: `header-title-sign-transaction` is attached. Sign: `button "Tap to Sign"`. While sending:
  `getByTestId('loading-logo')` and `.sheet-page[data-busy='true']`.
- Done: `getByTestId('success-sheet')`, then `button "Sounds good"`.

The journey pays the wallet's own Arkade address, taken from Receive the way a payer would get one. Proof is
the success sheet **and** a new row at the top of Recent activity on Home.

## Gotchas

- **Needs funds.** On the default test server a new wallet is empty and the journey stops at its first step
  with `failed (precondition)`. That is the correct result. To see it pass, run against regtest and fund the
  wallet first (`faucetOffchain` in `src/test/e2e/fundedWallet.ts`). Do not trim the journey to reach green.
- As of 2026-11-18 this journey has never passed anywhere: it was written against the code and the mock
  harness, and no funded real run has happened yet. Treat every selector past the precondition as a draft.
- `src/test/e2e/send.test.ts` and `lnsend.test.ts` cover sending on regtest. Their shared helpers
  (`openSendKeypad`, `sendMax`, `prePay` in `src/test/e2e/utils.ts`) follow the phone flow above, without a
  regtest run to confirm.
- Tapping the amount field before the recipient has resolved opens the keypad early. It no longer loses
  digits when the form updates underneath, but wait for the keypad to open by itself so the test follows
  the path a person takes.
- Not covered: Scan, deep links, Lightning and onchain recipients, asset sends, failed and refunded sends.
