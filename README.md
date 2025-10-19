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

### Build-Time Variables (VITE_*)

These are baked into the build and require rebuilding to change:

| Variable             | Description                                               | Example Value                        |
|----------------------|-----------------------------------------------------------|--------------------------------------|
| `VITE_ARK_SERVER`    | Override the default Arkade server URL                    | `VITE_ARK_SERVER=http://localhost:7070` |
| `VITE_MAX_PERCENTAGE`| Maximum percentage threshold for VTXO management          | `VITE_MAX_PERCENTAGE=10`             |
| `VITE_BOLTZ_URL`     | Override the default Boltz swap provider URL for Lightning| `VITE_BOLTZ_URL=https://your-boltz-provider-url.com` |
| `VITE_SENTRY_DSN`    | Enable Sentry error tracking (only in production, not on localhost) | `VITE_SENTRY_DSN=your-sentry-dsn`    |
| `CI`                 | Set to `true` for Continuous Integration environments     | `CI=true`                            |
| `GENERATE_SOURCEMAP` | Disable source map generation during build                | `GENERATE_SOURCEMAP=false`           |

### Runtime Variables (Docker)

These can be changed without rebuilding the image:

| Variable             | Description                                               | Example Value                        |
|----------------------|-----------------------------------------------------------|--------------------------------------|
| `ARK_SERVER`         | Override the default Arkade server URL                    | `ARK_SERVER=http://localhost:7070` |
| `MAX_PERCENTAGE`     | Maximum percentage threshold for VTXO management          | `MAX_PERCENTAGE=10`                  |
| `BOLTZ_URL`          | Override the default Boltz swap provider URL for Lightning| `BOLTZ_URL=https://your-boltz-provider-url.com` |
| `SENTRY_DSN`         | Enable Sentry error tracking (only in production, not on localhost) | `SENTRY_DSN=your-sentry-dsn` |

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

## Docker Deployment

### Quick Start

Pull and run the latest image from GitHub Container Registry:

```bash
docker run -p 8080:80 \
  -e ARK_SERVER="http://localhost:7070" \
  -e MAX_PERCENTAGE="10" \
  -e BOLTZ_URL="https://your-boltz-provider-url.com" \
  ghcr.io/arkade-os/wallet:latest
```

Access the app at http://localhost:8080

### Using Docker Compose

```yaml
services:
  wallet:
    image: ghcr.io/arkade-os/wallet:latest
    ports:
      - "8080:80"
    environment:
      ARK_SERVER: "http://localhost:7070"
      MAX_PERCENTAGE: "10"
      BOLTZ_URL: "https://your-boltz-provider-url.com"
      SENTRY_DSN: "your-sentry-dsn"
```

### Runtime Configuration

The Docker image supports runtime configuration without rebuilding. Set environment variables at container startup:
- **`ARK_SERVER`** - Override the default Arkade server URL
- **`MAX_PERCENTAGE`** - Maximum percentage threshold for VTXO management
- **`BOLTZ_URL`** - Override the default Boltz swap provider URL for Lightning
- **`SENTRY_DSN`** - Enable Sentry error tracking (only in production, not on localhost)

Deploy once, configure per environment - no rebuilds needed!
