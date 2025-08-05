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

### Build native apps with Capacitor

Capacitor projects are initialized in this repository. After installing
dependencies you can sync the native projects by running:

```bash
pnpm run sync
```

To open the Android or iOS projects use the following commands:

```bash
pnpm run android
pnpm run ios
```

## Troubleshooting

### iOS Setup Issues

If you encounter errors when adding iOS support or running `pnpm run ios`, try the following solutions:

#### Xcode Plugin Loading Errors

If you see errors related to `IDESimulatorFoundation` or missing frameworks like `DVTDownloads.framework`, run:

```bash
xcodebuild -runFirstLaunch
```

This initializes Xcode and installs missing system frameworks.

#### Pod Install Failures

If the Capacitor iOS setup fails during pod installation:

1. Navigate to the iOS project directory and run pod install manually:

   ```bash
   cd ios/App
   pod install
   ```

2. Then sync the Capacitor project:

   ```bash
   pnpm run sync
   ```

#### General iOS Development Setup

Make sure you have:

- Xcode installed from the Mac App Store
- Xcode Command Line Tools: `xcode-select --install`
- CocoaPods installed: `sudo gem install cocoapods`

#### Clean Build

If you're still experiencing issues, try a clean build:

```bash
# Clean the build directory
rm -rf dist

# Clean iOS build artifacts
rm -rf ios/App/App/public
rm -rf ios/App/build

# Reinstall dependencies and sync
pnpm install
pnpm run sync
```
