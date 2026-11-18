# Onboarding

The first screen a new user sees: two ways into a wallet, each saying what it needs.

## Sub-features

- Heading **Set up your wallet**. No welcome, no selling points, no logo and no intro animation.
- **Create a new wallet** ("No account needed"): generates a recovery phrase in the browser and goes straight
  to Home. No password step.
- **Restore a wallet** ("With your recovery phrase or private key"): opens Restore wallet directly. It used to
  sit behind an "Other login options" sheet.
- Both choices stay disabled until the Arkade server has answered. If it cannot be reached, an inline error
  says so and they stay disabled.
- Hidden: three taps on the heading turn on developer mode, which adds a rotation toggle to creating a wallet.

## How to get to it (user POV)

Open the wallet in a browser that has never held one. Tap **Create a new wallet**. A pixel loader covers the
screen while the wallet connects, then Home appears with a zero balance.

## Driving it with Playwright

`node .cursor/skills/verify-arkade-wallet/scripts/drive.cjs onboarding`

- Heading: `getByTestId('onboarding-devmode-tap')`. Choices: `.onboard__choice`.
- Create: `getByTestId('onboarding-create')`. Wait for it to enable before clicking.
- Restore: `getByTestId('onboarding-restore')`, which lands on `header-title-restore-wallet`.
  `header-back-btn` returns to the choices.
- Arrived: `getByTestId('home-action-send')` visible. If `getByText('Continue anyway')` shows instead, boot
  failed; that is a failure, not something to click through.

The journey opens Restore and comes back before creating, so both entry points are exercised. Proof of
creation is the end state, not the arrival: after a reload the wallet is still there (`localStorage.wallet`
has a `pubkey`), onboarding does not come back, and the service worker registration is `activated`.

## Gotchas

- Needs a fresh profile. In a run where another journey already created the wallet, `onboarding` fails with a
  precondition error. Put it first, or run `cleanup.sh` and `launch.sh` again.
- Against the default test server the first boot can take 15 to 30 seconds. The driver waits up to two minutes.
- Restore is opened but never filled in. It needs a recovery phrase, and this skill never handles one.
  `src/test/e2e/nostr.test.ts` and `mnemonic-autocomplete.test.ts` exercise it on regtest.
- The in-app-browser interstitial (`Pages.InAppBrowser`) is a different screen and still says "Welcome to
  Arkade". It is not driven.
