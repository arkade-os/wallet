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
| `CI`                        | Set to `true` for Continuous Integration environments               | `CI=true`                                         |
| `GENERATE_SOURCEMAP`        | Disable source map generation during build                          | `GENERATE_SOURCEMAP=false`                        |
| `VITE_LENDASAT_IFRAME_URL`  | Overwrite the default LendaSat URL                                  | `VITE_LENDASAT_IFRAME_URL=http://localhost:5173`  |
| `VITE_LENDASWAP_IFRAME_URL` | Overwrite the default LendaSwap URL                                 | `VITE_LENDASWAP_IFRAME_URL=http://localhost:5174` |
| `VITE_UTXO_MAX_AMOUNT`.     | Overwrite the server's utxoMaxAmount                                | `VITE_UTXO_MAX_AMOUNT=-1`                         |
| `VITE_UTXO_MIN_AMOUNT`.     | Overwrite the server's utxoMinAmount                                | `VITE_UTXO_MIN_AMOUNT=330`                        |
| `VITE_VTXO_MAX_AMOUNT`.     | Overwrite the server's vtxoMaxAmount                                | `VITE_VTXO_MAX_AMOUNT=-1`                         |
| `VITE_VTXO_MIN_AMOUNT`.     | Overwrite the server's vtxoMinAmount                                | `VITE_VTXO_MIN_AMOUNT=330`                        |

## Getting Started

### Prerequisites

- Node.js v20.19+ or v22.12+ (Required by Vite 7)
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

### Funding your local wallet
To interact with Ark features, you need Regtest coins.
1. Copy your address from the wallet's **Receive** screen (ensure it starts with bcrt1 for Regtest).
2. Run the Nigiri faucet command:
```bash
nigiri faucet <bcrt-address>
```

## CLI Tools

### Unilateral Exit CLI

A command-line tool to perform unilateral exit from the ARK protocol using a nsec private key. This allows you to withdraw your funds from the Ark protocol back to the Bitcoin blockchain without requiring cooperation from the Ark server.

#### Prerequisites

- Node.js v20.19+ or v22.12+
- PNPM >=8
- A funded onchain wallet (for P2A transaction fees)

#### Usage

```bash
pnpm unilateral-exit --nsec <nsec> --address <btc-address> [options]
```

#### Options

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--nsec <nsec>` | Nostr secret key (nsec format) | Yes | - |
| `--address <address>` | Bitcoin address to receive funds | Yes | - |
| `--ark-server <url>` | ARK server URL | No | `https://mutinynet.arkade.sh` |
| `--esplora <url>` | Esplora API URL | No | `https://mutinynet.com/api` |
| `--network <network>` | Bitcoin network (mainnet, testnet, regtest) | No | `testnet` |
| `--vtxo <txid:vout>` | Specific VTXO to exit (exits all if not specified) | No | - |
| `--help, -h` | Show help message | No | - |

#### Environment Variables

You can also configure the CLI using environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `ARK_SERVER` | ARK server URL | `ARK_SERVER=https://mutinynet.arkade.sh` |
| `ESPLORA_URL` | Esplora API URL | `ESPLORA_URL=https://mutinynet.com/api` |
| `NETWORK` | Bitcoin network | `NETWORK=testnet` |

#### Examples

**Exit all VTXOs:**
```bash
pnpm unilateral-exit \
  --nsec nsec1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  --address tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx
```

**Exit a specific VTXO:**
```bash
pnpm unilateral-exit \
  --nsec nsec1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  --address tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx \
  --vtxo abc123def456789...:0
```

**Using environment variables:**
```bash
export ARK_SERVER=https://mutinynet.arkade.sh
export NETWORK=testnet
pnpm unilateral-exit \
  --nsec nsec1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  --address tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx
```

#### How It Works

The unilateral exit process involves two main steps:

1. **Unrolling**: Broadcasting the transaction chain from off-chain back to on-chain
   - Traverses the VTXO transaction chain from root to leaf
   - Broadcasts each transaction that isn't already on-chain
   - Waits for confirmations between steps
   - Uses P2A (Pay-to-Anchor) transactions to pay for fees

2. **Completing the Exit**: Spending the unrolled VTXOs after the timelock expires
   - Can only be executed after VTXOs are fully unrolled
   - Must wait for the unilateral exit timelock to expire
   - Sends funds to the specified Bitcoin address

#### Important Notes

- **Onchain Funds Required**: Your wallet needs sufficient on-chain funds to pay for P2A transaction fees during the unroll process
- **Timelock Delay**: After unrolling, you must wait for the unilateral exit timelock to expire before funds can be claimed
- **Storage**: Wallet data is stored in `~/.arkade-cli/` directory
- **Multiple VTXOs**: The CLI will process all VTXOs by default, or a specific one if `--vtxo` is provided
- **Retry**: If the timelock hasn't expired, you can run the same command again later to complete the exit

#### Troubleshooting

**Error: "Timelock has not expired yet"**
- The VTXO is unrolled but you need to wait for the timelock period to expire
- Run the same command again after the timelock period

**Error: "No VTXOs found"**
- Your wallet doesn't have any VTXOs to exit
- Verify you're using the correct nsec and ARK server

**Error: "Insufficient funds for P2A fees"**
- Your onchain wallet needs funds to pay for transaction fees
- Send some satoshis to your onchain address (shown in the CLI output)

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

## Troubleshooting
### `address already in use` (Port 5000) on macOS
macOS AirPlay Receiver uses port 5000 by default, which conflicts with Nigiri.
- **Fix:** Go to `System Settings > General > AirDrop & Handoff` and disable **AirPlay Receiver**.

