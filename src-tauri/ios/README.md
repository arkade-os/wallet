# Native platform builds

The existing wallet frontend and SDK run in each Tauri host. `pnpm native:dev` and `pnpm native:build` choose the current desktop platform and invoke Tauri with its platform settings. Install Rust, Node from `.nvmrc`, pnpm, and Python 3 for the iOS metadata checks before building.

Linux builds require Tauri's WebKitGTK prerequisites and `pkg-config`. Software wallets require an unlocked Secret Service provider with a persistent default collection in the user's desktop session, such as GNOME Keyring or a compatible provider. A missing/locked service fails secure storage; there is no plaintext fallback. Backup file pickers require XDG Desktop Portal and a compatible GTK/KDE desktop backend. The Debian package recommends these providers. macOS uses the system Keychain service. Its camera purpose text and camera resource entitlement cover the shared browser QR scanner. Hardened runtime remains enabled without broad JIT or library-validation exceptions. Distribution signing still needs platform verification before any release.

On a Mac with full Xcode and an installed iOS simulator:

```sh
pnpm native:ios:init --ci
pnpm native:ios --open
pnpm native:ios:build --debug --target aarch64-sim --no-sign --ci
```

An Intel Mac uses `--target x86_64` for the simulator. Physical iPhone builds need the developer's Apple team and provisioning profile; set `APPLE_DEVELOPMENT_TEAM` locally. No signing credentials or releases are configured here. Simulator checks establish build and policy behavior; camera behavior still needs a real-device check.

The iOS config requires iOS 14+ and links AVFoundation. `Info.plist` supplies camera purpose text and the Bitcoin, Lightning, Arkade, and web+arkade URL schemes. The wallet excludes app data from automatic backups and uses explicit encrypted backups for recovery.

`native:ios:init` generates a project only when `gen/apple` is absent. Existing Xcode projects are retained. `native:ios:prepare` parses and adds the required plist fields while preserving unrelated keys, custom camera purpose text, URL types, and entitlements; conflicting backup flags, deployment targets, or signing paths fail without rewriting the project. `native:ios:prepare --check` verifies metadata without writing. The base host adds no entitlement requirements and creates an empty generated entitlement file if the signing path needs one. Tauri's supported `bundle.iOS.infoPlist` merge also supplies the metadata. Opening Xcode directly after reinitializing should be preceded by preparation. Changes to required linked frameworks in an existing Xcode project need manual review; initialization does not reset that work.

`pnpm test:native:platforms` checks host selection, platform settings, and additive iOS preparation using disposable fixtures. `native-platforms.yml` adds native macOS/Linux builds and Rust tests plus an unsigned iOS simulator build and wallet XCTest target. App/DEB builds are covered by those jobs; DMG/AppImage packaging, distribution signing, real-device camera behavior, and macOS/Linux system payment-link registration remain separate gates. No desktop deep-link support is claimed from these config files alone.

The wallet XCTest suite runs all existing package tests inside the simulator-only `wallet-tests` host. Unhosted SwiftPM tests lack Keychain entitlements and fail with `errSecMissingEntitlement`. The host uses ad-hoc signing and an isolated synthetic access group; it requires no development team, certificate or provisioning profile and cannot compile for a physical device. Production vault policy and entitlements are unchanged. After the iOS build has prepared the local Tauri package, run from the repository root:

```sh
xcodegen generate --spec src-tauri/ios/wallet-tests/project.json --project src-tauri/ios/wallet-tests
xcodebuild -project src-tauri/ios/wallet-tests/WalletServiceTests.xcodeproj -scheme WalletServiceTests -sdk iphonesimulator -destination "platform=iOS Simulator,id=$IOS_SIMULATOR" -derivedDataPath "$TMPDIR/arkade-wallet-tests" test
```

Configuration fields are checked against the installed Tauri CLI 2.12.4 schema. The CLI's iOS build/init behavior was inspected at official revision `993038c49185307dfc895ab7657d77ca0d5ed7c7`. [Tauri configuration reference](https://v2.tauri.app/reference/config/) and [iOS setup](https://v2.tauri.app/start/prerequisites/#ios) describe the native tooling requirements.
