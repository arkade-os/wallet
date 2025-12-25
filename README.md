# 👾 Arkade Wallet

Arkade Wallet is the entry-point to the Arkade ecosystem—a self-custodial Bitcoin wallet delivered as a lightweight Progressive Web App (installable on mobile or desktop in seconds, no app-store gatekeepers). Built around the open-source ARK protocol, it speaks natively to any [arkd](https://github.com/arkade-os/arkd) instance, letting you create, send, and receive Virtual Transaction Outputs (VTXOs) for instant, off-chain pre-confirmations and batched, fee-efficient on-chain settlement.

## Screenshots

<!-- Using a table for more consistent layout -->
<table>
  <tr>
    <td width="50%" align="center">
      <img src="./mockup/new-wallet.png" alt="New Wallet" width="250">
    </td>
    <td width="50%" align="center">
      <img src="./mockup/home-arkade-wallet.png" alt="Home Screen" width="250">
    </td>
  </tr>
</table>

## Environment Variables

| Variable                    | Description                                                         | Example Value                                     |
| --------------------------- | ------------------------------------------------------------------- | ------------------------------------------------- |
| `VITE_ARK_SERVER`           | Override the default Arkade server URL                              | `VITE_ARK_SERVER=http://localhost:7070`           |
| `VITE_BOLTZ_URL`            | Override the default Boltz swap provider URL for Lightning          | `VITE_BOLTZ_URL=https://boltz-provider-url.com`   |
| `VITE_CHATWOOT_WEBSITE_TOKEN` | ChatWoot website token for customer support integration           | `VITE_CHATWOOT_WEBSITE_TOKEN=your-token`          |
| `VITE_CHATWOOT_BASE_URL`    | ChatWoot server base URL for customer support integration           | `VITE_CHATWOOT_BASE_URL=https://app.chatwoot.com` |
| `VITE_PSA_MESSAGE`          | Manage message to show in wallet index page                         | `VITE_PSA_MESSAGE=@arkade_os on TG for support`   |
| `VITE_SENTRY_DSN`           | Enable Sentry error tracking (only in production, not on localhost) | `VITE_SENTRY_DSN=your-sentry-dsn`                 |
| `CI`                        | Set to `true` for Continuous Integration environments           | `CI=true`                                         |
| `GENERATE_SOURCEMAP`        | Disable source map generation during build                      | `GENERATE_SOURCEMAP=false`                        |
| `VITE_LENDASAT_IFRAME_URL`  | Overwrite the default LendaSat URL                              | `VITE_LENDASAT_IFRAME_URL=http://localhost:5173`  |
| `VITE_LENDASWAP_IFRAME_URL` | Overwrite the default LendaSwap URL                             | `VITE_LENDASWAP_IFRAME_URL=http://localhost:5174` |
| `VITE_UTXO_MAX_AMOUNT`.     | Overwrite the server's utxoMaxAmount                            | `VITE_UTXO_MAX_AMOUNT=-1`                         |
| `VITE_UTXO_MIN_AMOUNT`.     | Overwrite the server's utxoMinAmount                            | `VITE_UTXO_MIN_AMOUNT=330`                        |
| `VITE_VTXO_MAX_AMOUNT`.     | Overwrite the server's vtxoMaxAmount                            | `VITE_VTXO_MAX_AMOUNT=-1`                         |
| `VITE_VTXO_MIN_AMOUNT`.     | Overwrite the server's vtxoMinAmount                            | `VITE_VTXO_MIN_AMOUNT=330`                        |
| `VITE_ARK_ESCROW_URL` | Override the default Ark Escrow app URL for Ark Escrow              | `VITE_ARK_ESCROW_URL=https://your-ark-escrow-app-url.com` |

## Getting Started

### Prerequisites

- Node.js >=20
- PNPM >=8

### Installation

Install dependencies

```bash
pnpm install
```

## Development

### `pnpm run start`

Runs the app in the development mode.\
Open [http://localhost:3002](http://localhost:3002) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `pnpm run build`

Builds the app for production to the `dist` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

### `pnpm run regtest`

Starts the regtest environment and sets up the arkd instance.\
Requires Docker to be installed and [Nigiri](https://nigiri.vulpem.com/) to be running with `--ln` flag.

### e2e tests

> note: e2e tests require a regtest environment to be running.
> `pnpm run regtest` to start and setup the regtest environment.

> note: e2e tests use playwright for ui testing, you may need to run
> `pnpm exec playwright install` once to download new browsers.

Run the tests with:

```bash
pnpm run test:e2e
```

Run the tests in interactive mode with:

```bash
pnpm run test:e2e --ui
```

Access the playwright code generator tool with:

```bash
pnpm run test:codegen
```
