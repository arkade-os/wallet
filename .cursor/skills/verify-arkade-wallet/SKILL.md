---
name: verify-arkade-wallet
description: Verify the Arkade wallet (a React PWA) by driving the real app in a browser the way a user would, capturing screenshots and state as evidence, and cleaning up. Use after any change to onboarding, Home, Receive, Send, Settings or theming, and before calling UI work done.
---

# Verify the Arkade wallet

Unit tests prove logic. This proves the wallet works when someone uses it: it starts the app, drives the real
UI with Playwright, reads back the side effects (storage, service worker, clipboard), and leaves screenshots
and a step log behind. Read `features/README.md` for the map of what can be driven.

All commands run from the repository root. `S` below is `.cursor/skills/verify-arkade-wallet/scripts`.

## Launch

```bash
bash .cursor/skills/verify-arkade-wallet/scripts/launch.sh
```

It runs `pnpm git-info` and `pnpm build:worker` (the service worker the wallet cannot start without), then
starts Vite on port **3102** and records the pid, port and server in `.verify/arkade-wallet/run/`. Port 3102 is
deliberate: 3002 is where a person's own `pnpm start` lives, and this never shares it.

Ready means usable, not listening. The script returns once `/` serves the app shell **and** `/src/index.tsx`
compiles, then prints `launch: ready on http://localhost:3102 (pid …, server …)`. It exits non-zero with the
tail of the server log if Vite dies, and refuses to start if the port is taken or an earlier run is still up.

There is no login and no seed data. A fresh browser profile shows onboarding, and the first journey creates a
throwaway wallet through it. The wallet needs an Arkade server:

| Target | How | Notes |
| --- | --- | --- |
| Public test network (default) | nothing to set; `VITE_ARK_SERVER=https://mutinynet.arkade.sh` | Same default as `.cursor/dev-server.sh`. Wallets start empty, so Send cannot complete. |
| Local regtest | `pnpm regtest:start`, then `VITE_ARK_SERVER=http://localhost:7070 bash $S/launch.sh` | Needs Docker. Fund a wallet with `faucetOffchain` from `src/test/e2e/fundedWallet.ts`. |

Never point this at `https://arkade.computer`. That is mainnet.

One-time setup on a new machine: `pnpm install`, then `pnpm exec playwright install chromium`.

Two instances can run side by side: give each its own `VERIFY_PORT`. They would still share
`.verify/arkade-wallet/run/`, so a second parallel run also needs its own checkout. Do not drive an instance
you did not launch, and never drive the one a person has open on 3002: the wallet in that browser is theirs.

## Doctor

```bash
bash .cursor/skills/verify-arkade-wallet/scripts/doctor.sh
```

Read-only. Run it after launch, and first whenever a journey fails for a reason that does not look like the
app. It checks that the recorded server process is alive, that port 3102 is owned by **that** process, that the
app shell is served, that the commit being served is `HEAD` (a stale server is the usual cause of "my fix did
nothing"), and that the Arkade server answers `/v1/info`. Every line is `ok` or `FAIL`; the exit code is
non-zero on any `FAIL`. It notes when uncommitted changes are being served.

## Drive

```bash
node .cursor/skills/verify-arkade-wallet/scripts/drive.cjs <journey...> [--theme=light|dark] [--viewport=mobile|desktop] [--run=<id>]
```

Journeys: `onboarding`, `home`, `receive`, `settings-theme`, `send`. Each is described in `features/`.
Several can be named in one call; they share one browser profile, so the wallet `onboarding` creates is the
one the others use. `--viewport=mobile` is a Pixel 7; `desktop` is 1280×800, where a sidebar replaces the
header actions. `--theme` sets the system colour scheme, which the wallet follows while its theme is Auto.

The driver only does what a user can do: taps, typing, reloads. It writes nothing to storage and calls no
test hooks. It reads `localStorage`, the service worker registration and the clipboard to prove what an
action left behind. It never reads or records the recovery phrase or a private key, and neither should you.

Handles are stable ones from this repo, in this order of preference:

- `data-testid`: `home-action-receive`, `home-action-send`, `home-action-scan`, `home-action-swap`,
  `top-right-settings`, `activity-view-all`, `header-back-btn`, `header-title-<screen-name>`,
  `receive-formats`, `receive-amount`, `keyboard-0`…`keyboard-9`, `save-amount`, `success-sheet`,
  `settings-buy-sell`, `select-option-<n>`, `desktop-nav-home|activity|settings`, `onboarding-devmode-tap`.
- Roles and names: `button "+ Create wallet"`, `button "Copy QR code"`, `button "Add amount"` / `"Edit amount"`,
  `button "Tap to Sign"`, `button "Sounds good"`, `radiogroup` with `radio` rows in the formats sheet.
- Field names: `[name="send-address"]`, `[name="send-amount"]`.

To add a journey, add a function to `JOURNEYS` in `scripts/drive.cjs`, wrap each user action in `step()`, and
add or update its file under `features/`.

## Evidence

Everything lands in `.verify/arkade-wallet/evidence/<run-id>/<journey>-<viewport>-<theme>/`:

- `NN-<step>.png`: one screenshot after every step, in order, so the action and the state it produced are both
  on record. A step that fails leaves `NN-<step>-FAILED.png`.
- `steps.json`: each step, whether it held, and what was observed (clipboard contents shortened, persisted
  theme, service worker state, visible headings). `result` is `passed`, `failed` or `failed (precondition)`.
- `console-errors.log`: console errors seen during the journey. An uncaught page error fails the journey.

The driver prints one line per journey with its result and evidence path, and exits non-zero if any failed.

What counts as proof here:

- The visible result **and** its side effect. Creating a wallet is proven by a reload that lands on Home with
  an activated service worker, not by Home appearing once. Copy is proven by reading the clipboard. A theme
  change is proven by `config.theme`, the `palette-dark` class and the `theme-color` meta after a reload.
- The real path. Reaching a screen through `/preview.html` (the mock-data harness) is a stand-in: it shows
  layout, never behaviour. Say so when that is all you have.
- A journey that cannot meet its precondition **fails**, with the reason. `send` on an unfunded wallet is the
  standing example. Do not shorten the journey to make it pass.

## Cleanup

```bash
bash .cursor/skills/verify-arkade-wallet/scripts/cleanup.sh
```

Stops the one process whose pid `launch.sh` recorded, after checking it is still that Vite, and removes
`.verify/arkade-wallet/run/` (logs and the browser profile holding the throwaway wallet's key). It never kills
by name or by port, so a person's own dev server is untouched. `.verify/arkade-wallet/evidence/` is kept; the
script ends by listing it. `.verify/` is git-ignored. Run cleanup after a failed attempt too, so nothing is
left holding the port.

## Helpers

| Script | Invocation | Does |
| --- | --- | --- |
| `scripts/launch.sh` | `bash $S/launch.sh` | Build the worker, start Vite on 3102, wait until usable. |
| `scripts/doctor.sh` | `bash $S/doctor.sh` | Read-only health check of the launched instance. |
| `scripts/drive.cjs` | `node $S/drive.cjs receive --theme=dark` | Drive journeys and write evidence. |
| `scripts/cleanup.sh` | `bash $S/cleanup.sh` | Stop what launch started, drop scratch state, keep evidence. |
| `scripts/common.sh` | sourced by the three shell helpers | Shared paths. Not run directly. |

A full pass:

```bash
S=.cursor/skills/verify-arkade-wallet/scripts
bash $S/launch.sh && bash $S/doctor.sh \
  && node $S/drive.cjs onboarding home receive settings-theme --run=my-change
node $S/drive.cjs home receive --theme=dark --run=my-change
node $S/drive.cjs home settings-theme --viewport=desktop --run=my-change
bash $S/cleanup.sh
```

## Proven, and not yet

Proven end to end on 2026-11-18 (launch, doctor, `onboarding`, evidence, cleanup, evidence still present)
against the real app and the public mutinynet server. `home`, `receive` and `settings-theme` have since
passed on a phone viewport in light and dark, and `home` and `settings-theme` on desktop.

That run was in a Linux container. What it did that another machine may not, unverified until run there:

- Chromium came preinstalled next to a global Playwright. On a fresh checkout the driver uses the repo's
  `@playwright/test`, which needs `pnpm exec playwright install chromium` first.
- Node was 22; the repo asks for 24 (`.nvmrc`). pnpm warned and carried on.
- `doctor.sh` found the port owner with `ss`. The `lsof` branch, the one macOS takes, has not run.
- Headless Chromium has no Web Share API and no camera, so Share is disabled and Scan is not driven.

Not covered by any journey yet: a completed Send (needs funds, so regtest), Swap, restore from a recovery
phrase, password and lock, Notes, the Assets app, Buy or sell. `src/test/e2e/` covers several of these against
regtest; this skill does not replace it.

For upkeep as the app changes, use `/maintain-verification-skill`.
