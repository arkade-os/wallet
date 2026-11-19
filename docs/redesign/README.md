# Wallet redesign

This branch (`redesign`, forked from `master` at `83c0a6b`) moves the wallet to the minimal Arkade identity:
one accent, one icon set, ledge buttons, large figures, floating sheets, and a dark theme built from the same
tokens. Wallet logic, rails, quoting and signing are untouched; the changes are in presentation, navigation
motion and copy placement.

## Run it

```bash
pnpm install
VITE_ARK_SERVER=https://mutinynet.arkade.sh pnpm start   # http://localhost:3002, public test network
```

Dark theme: Settings → Display → Theme, or leave it on Auto and switch the system.

Two ways to look at it without a funded wallet:

- **Preview harness** (layout only, mock data): `http://localhost:3002/preview.html?screen=Wallet&theme=dark`.
  `screen` is any name from the `Pages` enum, or `_Keypad`, `_KeypadReceive`, `_Received`. `state=empty`,
  `state=hidden` and `state=btc` (a Bitcoin-only wallet set to BTC) change the fixtures. `node scripts/preview-shots.cjs out.png both Wallet SendForm` tiles
  screenshots. It is dev-only and is not part of the production build.
- **Verification skill** (the real app, driven like a user): `.cursor/skills/verify-arkade-wallet/SKILL.md`.

## What changed

**Foundations.** `src/tokens.css` gains the surface, ink, brand and scrim tokens for light and
`html.palette-dark`; `src/app.css` exposes them to Tailwind. Buttons are 52px with a 3px ledge and press in
90ms. `src/icons/Glyph.tsx` is the one icon set (24 grid, 1.75 stroke, round caps), and the existing icon
components now draw through it. Waiting is always the nine-cell pixel loader. Money is set in TT Firs Neue
with grey minor units (`Figure`). Flags and token logos give way to drawn currency marks. Recipients get a
3×3 pattern derived from their address (`AddressPattern`). Pinch zoom is no longer disabled.

**Home.** No logo, no bottom bar, no Apps entry, no promotions. Scan and Settings sit at the top right; on
desktop Settings moves to the sidebar and Scan stays. The balance leads, with the month's change and a value
line when there is history. Receive and Send are the two primary actions, set like the buttons on arkadeos.com:
the label in Geist Mono capitals and a pixel arrow at the end (`PixelArrow`, a 5×5 grid), Receive outlined in ink and
Send solid. Accounts and Recent activity open under a 2px rule, and accounts are a ruled list with amounts in mono. Scrolling collapses the balance
into the header. Activity opens from View all, which is there on an empty wallet too.

**Send.** Close instead of Back. On phones the keypad opens once the recipient resolves and its Continue goes
straight to review; its Max is the form's Max, so fees and the reserve are handled in one place. Review is a
sheet over the amount; signing turns the button into progress in place; success is the same sheet with a
drawn check. Nothing full-screen and purple. While a payment is being signed the sheet cannot be dismissed,
Escape does nothing and the desktop sidebar is inert. Back still leaves, as it does on `master`: the payment
carries on, records itself, refreshes the wallet and reports its result in a toast, and writes nothing into
the Send flow it no longer owns.

**Receive.** The requested amount leads, above a plain QR card with no logo. Rails move into an Other formats
sheet, one radio group covering formats and stablecoins, so Lightning stays in the background until a
sender's wallet asks for it. Copy and Share are unchanged.

**Swap.** The composer reads like the Send keypad: the figure leads, at the keypad's sizes with grey cents and
thousands separators, over the keypad's unit chip; a balance limit is said under it, as Send says one. The two
sides of the trade are flat rows, the asset with its balance and Max, and the asset to receive with its estimate
(and its value, when that is in another currency); the flip button sits on a 12px seam between them, clear of
their text. Below 700px tall the composer tightens; below 600px it scrolls rather than crowd. The keypad is the shared one, with no point key for
whole units. Review is laid out like Send's (the route, what arrives, then Swap, Fees and Rate as rows with
icons), with an inline error and a Cancel; its title stays as the sheet's accessible name. Success shows what
was given behind the sheet. The asset list and the receive picker keep their layout; their fields and rows now
use the sheet's well, so they match the other sheets in dark.

**Everything else.** Every drawer is a floating panel on a scrim. `Modal` is a real dialog: named, Tab stays
inside it, Escape closes it and focus returns to what opened it. An open sheet or dialog takes Escape before
the app goes Home, and takes Back before the screen under it does. Inline errors are a tinted note with
`role="alert"`. Boot and onboarding carry no logo or intro animation, and onboarding is two
explained choices, Create and Restore, with Restore on the screen instead of behind a sheet. Settings groups sit flat and gain a Buy
or sell row, which replaces the Home promotion. Receipts are plain rows. Charts use the one accent.

**Motion.** Screens drill sideways. Send, Receive and Scan rise as covers on a spring while Home recedes.
Review and success are sheets, so they do not slide. Browser Back animates everywhere except iOS, where the
system gesture already does. Home's entrance settles within half a second. Reduced motion is respected
throughout, and haptics no longer switch off with it.

## Copy

Product strings were kept unless listed here.

| Change | Why |
| --- | --- |
| Activity labels `Lightning receive` / `Lightning send` and their states become `Received`, `Receiving`, `Receive failed`, `Receive lost`, `Receive refunded`, `Sent`, `Sending`, `Send failed`, `Send lost`, `Send refunded` (en, es, pt) | Keep Lightning in the background |
| `Received via {rail}` / `Sent via {rail}` become `Received` / `Sent` | Same |
| New on Receive: `Other formats`, its intro and row descriptions, `Default`, `Showing {format}`, `A third party swaps them to Bitcoin for you` | From the approved design |
| New on Home and keypad: `this month`, `Available`, `Max`, `More than your balance`, `Close` | New controls need names |
| `Buy or sell bitcoin` → `Buy or sell Bitcoin`, and Bitcoin capitalised in two error strings (en) and in six Spanish and Portuguese strings | House rule |
| Portuguese `lnurlReceivedAt` / `lnurlSentTo` now include `{address}` | They dropped it; a bug fix |
| `Welcome to Arkade` loses its emoji (en, es, pt); it now shows only on the in-app-browser screen | Asked for |
| Onboarding is `Set up your wallet` with two choices: `Create a new wallet` / `No account needed` and `Restore a wallet` / `With your recovery phrase or private key`. The three taglines and `Other login options` are removed | Chosen direction for a more direct welcome |
| Removed: `receive.backToMethod`, `upsells.title`, `wallet.viewRecentActivity` | No longer shown |

Left alone and worth a decision: `Tap to Sign`, `Sounds good`,
`No password, YOLO`, and `Unified` as the default format's name.

Also open: Home's `this month` and the chart's `Value of your holdings over the past month`. The figures
re-price what the wallet holds today at past Bitcoin prices over 30 days; they are not the wallet's own
history, so a deposit made today still shows a month of change. The wording should say so.

## Checked

- `pnpm test:unit`: 129 files, 1417 tests pass. Tests that described the old UI were rewritten to describe the
  new one, not deleted: Receive's method selector, the success sheet, Home, activity labels, currency marks.
- `pnpm lint`, `pnpm format:check`, `pnpm csp:check`, `tsc --noEmit`, `pnpm build`: clean.
- Real app against the public mutinynet server, through the verification skill: onboarding, Home, Receive and
  Settings/theme pass on a phone viewport in light and dark and on desktop. Evidence is under
  `.verify/arkade-wallet/evidence/` (git-ignored).

## Review fixes

An outside review of `f13a3f2` found one blocker, four majors and nine minors. Each was checked against the
code before it was changed; two of the majors (the keypad losing digits, keypad Max skipping the fee) are also
on `master`.

| Finding | Fix | Proven by |
| --- | --- | --- |
| A pending Send could lose its progress and result | Sheet is not dismissable while signing, Escape is ignored, the desktop sidebar is inert, and a payment that outlives its screen records itself and reports by toast without touching the Send flow | `send-details.test.tsx`, `SheetPage.test.tsx` |
| Review backdrop showed the amount with balances hidden | `PrivateFigure` behind review and both success sheets | `send-details.test.tsx`, `PrivateFigure.test.tsx` |
| Keypad lost typed digits when the form re-rendered | The keypad is an element, not a component declared inside the form | `send-keypad.test.tsx` (fails on the old code) |
| Keypad Max skipped the fee-aware Max | Keypad Max calls the form's Max | `send-keypad.test.tsx` (fails on the old code), `keyboard.test.tsx` |
| No Scan on desktop Home | Only Settings hides at desktop widths | driver `home --viewport=desktop` |
| Formats sheet: no name, no arrow keys, Back left Receive | Named dialog, roving radio group, sheets and dialogs take Back | `receive-lnurl.test.tsx`, `navigation.test.tsx`, driver `receive` |
| Dialogs lost focus on close | `Modal` records the opener first, traps Tab, is named; nested dialog roles removed | `Modal.test.tsx` |
| Receive amount: zero fiat without a rate, unit ignored, balance warning | Falls back to the exact amount in the configured unit; the warning is for spending only | `receive-qrcode.test.tsx`, `keyboard.test.tsx` |
| Buy or sell Back skipped Settings | Header uses the navigation Back | driven on the real app, provider blocked |
| Cleanup could stop another process on pid reuse | Start time and launch arguments are recorded and checked before every signal | run against a reused pid |
| Receive tests lost their overlap coverage | Copy with the sheet closed; the formats row itself is checked against the QR stage | `receive-qrcode.test.tsx` |
| Review amount truncated at 375px | The figure scales to its length and wraps past its smallest size | measured at 320, 375 and 412px in the preview harness |
| Leftover spinners, icon, 14px fields, placeholder contrast, lowercase Bitcoin, dead selectors | Shared loader, `Glyph` home, 16px, `--ink-3`, six strings, removed | lint, unit tests |
| Empty Home had no way into Activity on a phone | View all is always there | `index.test.tsx`, driver `home` |

Not changed, on purpose: Home's month label (a copy decision, see above).

## SDK patch

`patches/@arkade-os__sdk@0.5.6.patch` changes the installed SDK build, and pnpm applies it at install
(`patchedDependencies` in `pnpm-workspace.yaml`). It carries one fix until an SDK release includes it.

The SDK asks the indexer for coins 500 to a page and read a shorter page as the last one. The server caps a
page at 100, so a wallet synced from scratch (restore, new device, cleared storage) kept only its newest 100
coins, spent ones included, and showed part of its balance and at most 100 rows of history. The patch makes
both loops follow the server's cursor. Source: `fix/vtxo-paging-clamped-page` in the SDK fork, commit
`00388ab1`, which carries the tests.

Checked on the test network with a 506-payment wallet: before, the wallet restored to 19,775 sats; with the
patch, to 89,800 sats and the full history, which is what the indexer holds.

The same mistake sat in two more places, fixed by the second commit on that branch (`2eb346a3`) and carried
by the same patch. Address discovery looked only at the newest 100 coins of each batch of candidate scripts,
so a restore could report a funded address as unused. The exit data source, which exit estimates read
through, returned the first 100 entries of a coin's chain; for one coin of that wallet the chain has 1,406.
It now asks for the whole chain in one request, because the server orders a chain differently on every
request and a paged walk of one loses entries. The wallet's own unilateral exit already read the chain that
way and was not affected. Checked on the test network: 1,406 entries and all 1,011 transactions, where the
unpatched SDK returned 100.

It costs time, because the wallet now reads every page: that wallet takes about 13 s to restore instead of 6.
Making that fast is the performance work that follows; showing the wrong balance quickly was not an option.

Remove the patch file and its `patchedDependencies` entry when the wallet moves to an SDK version with the
fix. pnpm refuses to install if the entry is left behind for a version that is no longer used.

## Not checked, not done

- **Playwright e2e (`pnpm test:e2e`) has not run here.** It needs the regtest Docker stack. The reviewer ran
  42 regtest cases against `f13a3f2`: 34 passed, seven desktop skips, one mobile onboarding failure, since
  fixed in `init.test.ts`. The Send specs and `prePay` were then rewritten for the phone flow (`openSendKeypad`,
  `sendMax` in `src/test/e2e/utils.ts`: wait for the keypad to open by itself, use its Max and Continue).
  Those rewrites have not been run.
- **A completed Send has not been driven on a phone on this branch.** The reviewer paid 5,000 sats on desktop
  regtest; the phone attempt hit the keypad bug fixed above. The `send` journey in the verification skill is
  written and fails on its precondition, as it should on an empty wallet.
- **No real devices.** Safe areas, haptics, the iOS back gesture, the install flow and camera scanning were
  not exercised on a phone.
- **Secondary screens were restyled through shared tokens and components, not individually.** The 21 Settings
  screens, Notes, the Assets app, Buy or sell and restore inherit the new look; only the Settings menu
  and Theme were reviewed closely in both themes. Expect leftovers there.
- **Dead styles remain** in `src/index.css` for components that no longer exist.
- From the migration plan, not started: font preload, manifest shortcuts, deferring the service-worker update
  reload, an offline line, lazy-loaded screens, removing unused dependencies.
