# Arkade Wallet

Arkade Wallet is a modern self-custodial **Bitcoin** wallet built as a Progressive Web App (PWA). It includes native support for the ARK protocol, enabling users to interact seamlessly with [arkd](https://github.com/arkade-os/arkd) instances. The wallet allows users to handle Virtual Transaction Outputs (VTXOs), facilitating offchain Bitcoin transactions with instant pre-confirmations and secure eventual onchain settlement, all without giving up custody or requiring protocol changes to Bitcoin.

## Screenshots

<div style="display: flex; flex-direction: row; justify-content: space-between; flex-wrap: wrap; gap: 20px;">
  <div style="flex: 1; min-width: 200px; max-width: 50%;">
    <h3>New Wallet Creation</h3>
    <img src="./mockup/new-wallet.png" alt="New Wallet" style="width: 100%; max-width: 300px;">
  </div>

  <div style="flex: 1; min-width: 200px; max-width: 50%;">
    <h3>Home Screen</h3>
    <img src="./mockup/home-arkade-wallet.png" alt="Home Screen" style="width: 100%; max-width: 300px;">
  </div>
</div>

## Getting Started

### Prerequisites

- Node.js >=18
- PNPM >=8

### Installation

Install dependencies

   ```bash
   pnpm install
   ```

## Development

### `pnpm start`

Runs the app in the development mode.\
Open [http://localhost:3002](http://localhost:3002) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `pnpm build`

Builds the app for production to the `dist` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!
