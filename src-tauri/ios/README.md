# Native platform builds

The existing wallet frontend and SDK run in each Tauri host. `pnpm native:dev` and `pnpm native:build` choose the current desktop platform. Windows keeps the existing Tauri arguments and helper workflow. macOS and Linux build the Python PC/SC helper on the matching native OS and CPU before invoking Tauri; PyInstaller cannot cross-compile or produce a universal macOS helper. The desktop bundles retain the helper notices and licenses. Install Rust, Node from `.nvmrc`, pnpm, and native Python 3 before building.

Linux builds also require Tauri's WebKitGTK prerequisites, PC/SC headers, `pkg-config`, and SWIG. Installed wallets require `libpcsclite1`; reader use needs a running PC/SC daemon and reader drivers. Software wallets require an unlocked Secret Service provider with a persistent default collection in the user's desktop session, such as GNOME Keyring or a compatible provider. A missing/locked service fails secure storage; there is no plaintext fallback. Backup file pickers require XDG Desktop Portal and a compatible GTK/KDE desktop backend. The Debian package recommends these providers alongside `pcscd`. macOS uses the system PC/SC and Keychain services and SWIG for the helper build. Its camera purpose text and camera resource entitlement cover the shared browser QR scanner. Hardened runtime remains enabled without broad JIT or library-validation exceptions. Distribution signing and the packaged helper's signing behavior still need Mac verification before any release.

On a Mac with full Xcode and an installed iOS simulator:

```sh
pnpm native:ios:init --ci
pnpm native:ios --open
pnpm native:ios:build --debug --target aarch64-sim --no-sign --ci
```

An Intel Mac uses `--target x86_64` for the simulator. Physical iPhone builds need the developer's Apple team and an NFC-capable provisioning profile; set `APPLE_DEVELOPMENT_TEAM` locally. No signing credentials or releases are configured here. NFC requires a physical iPhone and card; simulator checks only establish build/policy behavior.

The iOS config requires iOS 14+, links CoreNFC/AVFoundation, and excludes every desktop Python sidecar/resource. `Info.plist` supplies camera/NFC purpose text, the actual Satochip AID `5361746F43686970`, and the Bitcoin, Lightning, Arkade, and web+arkade URL schemes. The NFC entitlement is `TAG`, not the NDEF-only browser NFC capability. The wallet excludes app data from automatic backups and uses explicit encrypted backups for recovery.

`native:ios:init` generates a project only when `gen/apple` is absent. Existing Xcode projects are retained. `native:ios:prepare` parses and adds the required plist fields while preserving unrelated keys, custom purpose text, URL types, and entitlements; conflicting backup flags, deployment targets, or signing paths fail without rewriting the project. `native:ios:prepare --check` verifies metadata without writing. The Satochip plugin's build hook reapplies the NFC entitlement during native builds. Tauri's supported `bundle.iOS.infoPlist` merge also supplies the metadata. Opening Xcode directly after reinitializing should be preceded by preparation. Changes to required linked frameworks in an existing Xcode project need manual review; initialization does not reset that work.

`pnpm test:native:platforms` checks host selection, sidecar target policy, platform settings, and additive iOS preparation using disposable fixtures. `native-platforms.yml` adds native macOS/Linux builds and Rust tests plus an unsigned iOS simulator build and XCTest targets. App/DEB builds are covered by those jobs; DMG/AppImage packaging, physical NFC, distribution signing, real-device camera behavior, and macOS/Linux system payment-link registration remain separate gates. No desktop deep-link support is claimed from these config files alone.

The wallet XCTest suite runs all existing package tests inside the simulator-only `wallet-tests` host. Unhosted SwiftPM tests lack Keychain entitlements and fail with `errSecMissingEntitlement`. The host uses ad-hoc signing and an isolated synthetic access group; it requires no development team, certificate or provisioning profile and cannot compile for a physical device. Production vault policy and entitlements are unchanged. After the iOS build has prepared the local Tauri package, run from the repository root:

```sh
xcodegen generate --spec src-tauri/ios/wallet-tests/project.json --project src-tauri/ios/wallet-tests
xcodebuild -project src-tauri/ios/wallet-tests/WalletServiceTests.xcodeproj -scheme WalletServiceTests -sdk iphonesimulator -destination "platform=iOS Simulator,id=$IOS_SIMULATOR" -derivedDataPath "$TMPDIR/arkade-wallet-tests" test
```

Configuration fields are checked against the installed Tauri CLI 2.12.4 schema. The CLI's iOS build/init behavior was inspected at official revision `993038c49185307dfc895ab7657d77ca0d5ed7c7`. [Tauri configuration reference](https://v2.tauri.app/reference/config/) and [iOS setup](https://v2.tauri.app/start/prerequisites/#ios) describe the native tooling requirements.
