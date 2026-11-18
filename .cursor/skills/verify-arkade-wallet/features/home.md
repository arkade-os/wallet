# Home

The balance, the two things people do with money, and the way to everything else.

## Sub-features

- Balance: a large figure with grey minor units and a secondary line in the other unit. With history and a
  fiat currency it also shows the month's change and a value line.
- **Receive** and **Send**: the only two primary actions.
- Header, phone: **Scan** and **Settings** at the top right, nothing else. Scrolling collapses the balance
  into the header's left side.
- Sidebar, desktop (1024px and up): Home, Activity, Settings. Settings leaves the header there; **Scan**
  stays, because it is the only way to scan.
- Accounts: one row per account, with **Swap** in the section header.
- Recent activity: the latest three rows and **View all**. Empty wallets show an empty state and keep
  View all, which on a phone is the only way into Activity.
- Notices: the install prompt and the set-a-password nudge, each dismissible.
- Not on Home by design: a bottom tab bar, an Apps entry, an Activity icon, promotions, the Arkade logo.

## How to get to it (user POV)

Open the wallet with a wallet already created. From any other screen, go back until you arrive; on desktop,
click Home in the sidebar.

## Driving it with Playwright

`node .cursor/skills/verify-arkade-wallet/scripts/drive.cjs home [--viewport=desktop] [--theme=dark]`

- Actions: `home-action-receive`, `home-action-send`, `home-action-swap`.
- Header, phone: `home-action-scan`, `top-right-settings`. The journey asserts the header holds exactly two
  buttons. Desktop: `home-action-scan`, plus `desktop-nav-home`, `desktop-nav-activity`,
  `desktop-nav-settings`.
- Balance: `.home-hero`, or `getByTestId('main-balance')` for the figure alone.
- Activity: `getByTestId('activity-view-all')`, then `header-title-activity`. The journey returns with
  browser Back.
- The journey also fails if `top-right-activity` or an Apps entry reappears.

Proof: the expected controls are visible, the removed ones are absent, Settings opens and returns, and
Activity opens and browser Back lands on Home.

## Gotchas

- A new wallet is empty, so the journey sees the empty state. The trend line, the chart, activity rows and
  the scroll collapse need history: fund the wallet on regtest to see them, or look at `/preview.html?screen=Wallet`
  for layout only.
- The entrance staggers for about half a second after boot. Screenshots are taken once it settles; a
  screenshot taken sooner will show sections half faded in and look like a bug.
- Entry points not covered: arriving from a deep link, and returning from a completed payment.
- Home stays in the DOM while another screen slides over it, so "Send is visible" does not mean you are on
  Home. The driver's `backToHome` also waits for the Back button of the screen on top to be gone. An earlier
  version did not, and passed a step that had never left Settings.
