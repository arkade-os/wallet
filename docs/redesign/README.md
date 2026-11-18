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
  `screen` is any name from the `Pages` enum, or `_Keypad`, `_KeypadReceive`, `_Received`. `state=empty` and
  `state=hidden` change the fixtures. `node scripts/preview-shots.cjs out.png both Wallet SendForm` tiles
  screenshots. It is dev-only and is not part of the production build.
- **Verification skill** (the real app, driven like a user): `.cursor/skills/verify-arkade-wallet/SKILL.md`.

## What changed

**Foundations.** `src/tokens.css` gains the surface, ink, brand and scrim tokens for light and
`html.palette-dark`; `src/app.css` exposes them to Tailwind. Buttons are 52px with a 3px ledge and press in
90ms. `src/icons/Glyph.tsx` is the one icon set (24 grid, 1.75 stroke, round caps), and the existing icon
components now draw through it. Waiting is always the nine-cell pixel loader. Money is set in TT Firs Neue
with grey minor units (`Figure`). Flags and token logos give way to drawn currency marks. Recipients get a
3×3 pattern derived from their address (`AddressPattern`). Pinch zoom is no longer disabled.

**Home.** No logo, no bottom bar, no Apps entry, no promotions. Scan and Settings sit at the top right. The
balance leads, with the month's change and a value line when there is history. Receive and Send are the two
primary actions. Scrolling collapses the balance into the header. Activity opens from View all.

**Send.** Close instead of Back. On phones the keypad opens once the recipient resolves and its Continue goes
straight to review. Review is a sheet over the amount; signing turns the button into progress in place; success
is the same sheet with a drawn check. Nothing full-screen and purple.

**Receive.** The requested amount leads, above a plain QR card with no logo. Rails move into an Other formats
sheet, one radio group covering formats and stablecoins, so Lightning stays in the background until a
sender's wallet asks for it. Copy and Share are unchanged.

**Everything else.** Every drawer is a floating panel on a scrim. `Modal` is a real dialog with Escape and
focus return, and an open sheet takes Escape before the app goes Home. Inline errors are a tinted note with
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
| `Buy or sell bitcoin` → `Buy or sell Bitcoin`, and Bitcoin capitalised in two error strings | House rule |
| Portuguese `lnurlReceivedAt` / `lnurlSentTo` now include `{address}` | They dropped it; a bug fix |
| `Welcome to Arkade` loses its emoji (en, es, pt); it now shows only on the in-app-browser screen | Asked for |
| Onboarding is `Set up your wallet` with two choices: `Create a new wallet` / `No account needed` and `Restore a wallet` / `With your recovery phrase or private key`. The three taglines and `Other login options` are removed | Chosen direction for a more direct welcome |
| Removed: `receive.backToMethod`, `upsells.title`, `wallet.viewRecentActivity` | No longer shown |

Left alone and worth a decision: `Tap to Sign`, `Sounds good`,
`No password, YOLO`, and `Unified` as the default format's name.

## Checked

- `pnpm test:unit`: 125 files, 1383 tests pass. Tests that described the old UI were rewritten to describe the
  new one, not deleted: Receive's method selector, the success sheet, Home, activity labels, currency marks.
- `pnpm lint`, `pnpm format:check`, `pnpm csp:check`, `tsc --noEmit`, `pnpm build`: clean.
- Real app against the public mutinynet server, through the verification skill: onboarding, Home, Receive and
  Settings/theme pass on a phone viewport in light and dark and on desktop. Evidence is under
  `.verify/arkade-wallet/evidence/` (git-ignored).

## Not checked, not done

- **Playwright e2e (`pnpm test:e2e`) has not run.** It needs the regtest Docker stack. The shared helpers in
  `src/test/e2e/utils.ts` were updated for the new Activity entry, Close buttons and keypad, unverified.
  `keyboard.test.ts` drives the keypad closely and is the most likely to need work.
- **A completed Send has never been driven on this branch.** It needs funds. The `send` journey in the
  verification skill is written and fails on its precondition, as it should on an empty wallet.
- **No real devices.** Safe areas, haptics, the iOS back gesture, the install flow and camera scanning were
  not exercised on a phone.
- **Secondary screens were restyled through shared tokens and components, not individually.** The 21 Settings
  screens, Swap, Notes, the Assets app, Buy or sell and restore inherit the new look; only the Settings menu
  and Theme were reviewed closely in both themes. Expect leftovers there.
- **Dead styles remain** in `src/index.css` for components that no longer exist.
- From the migration plan, not started: font preload, manifest shortcuts, deferring the service-worker update
  reload, an offline line, lazy-loaded screens, removing unused dependencies.
