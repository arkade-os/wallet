# Onboarding

The first screen a new user sees, and the one tap that gives them a wallet.

## Sub-features

- Welcome: a heading and three points. No logo and no intro animation; the content is there at once.
- **+ Create wallet**: generates a recovery phrase in the browser and goes straight to Home. No password step.
- **Other login options**: a sheet with Restore wallet (recovery phrase or private key).
- Both buttons stay disabled until the Arkade server has answered. If it cannot be reached, an inline error
  says so and the buttons stay disabled.
- Hidden: three taps on the heading turn on developer mode, which adds a rotation toggle to Create wallet.

## How to get to it (user POV)

Open the wallet in a browser that has never held one. Tap **+ Create wallet**. A pixel loader covers the
screen while the wallet connects, then Home appears with a zero balance.

## Driving it with Playwright

`node .cursor/skills/verify-arkade-wallet/scripts/drive.cjs onboarding`

- Heading: `getByTestId('onboarding-devmode-tap')`. Points: `.onboard__point p`.
- Create: `getByRole('button', { name: '+ Create wallet' })`. Wait for it to enable before clicking.
- Arrived: `getByTestId('home-action-send')` visible. If `getByText('Continue anyway')` shows instead, boot
  failed; that is a failure, not something to click through.

Proof is the end state, not the arrival: after a reload the wallet is still there (`localStorage.wallet` has
a `pubkey`), onboarding does not come back, and the service worker registration is `activated`.

## Gotchas

- Needs a fresh profile. In a run where another journey already created the wallet, `onboarding` fails with a
  precondition error. Put it first, or run `cleanup.sh` and `launch.sh` again.
- Against the default test server the first boot can take 15 to 30 seconds. The driver waits up to two minutes.
- Restore is not driven. It needs a recovery phrase, and this skill never handles one.
  `src/test/e2e/nostr.test.ts` and `mnemonic-autocomplete.test.ts` exercise it on regtest.
