# Arkade native host

This branch also includes the stacked [Satochip feature](../docs/native-satochip.md).
Desktop card builds package the pinned Python helper and require Python build tools,
SWIG and PC/SC development headers on the matching OS/architecture. Linux card use
requires PC/SC and its reader driver. Android/iOS use native NFC transports. The
shared app preparation/build scripts remain in `android/`; provider sources remain
under `plugins/satochip/`. See the feature guide for setup, PIN entry and test limits.

This Tauri host embeds the existing wallet's production build and published SDK.
Wallet screens, routing, swaps and activity remain in the shared React application.
The host provides protected credentials, SQLite repositories, QR scanning, backups,
payment links, notifications and platform lifecycle events to the bundled main window.

## Windows

Install Rust's MSVC toolchain, the Microsoft C++ build tools and the repository's
Node/pnpm versions. The installed application does not require Python or Node.

```powershell
pnpm install --frozen-lockfile
pnpm native:dev
```

`pnpm native:build` builds the shared wallet frontend and packages an NSIS installer.

## Android

Install the Android SDK/NDK required by Tauri. Run `pnpm native:android:init` once to
generate and prepare the local Android project, then `pnpm native:android` or
`pnpm native:android:build --debug --apk --target aarch64`.

Release APKs can target one architecture with `pnpm native:android:build --apk
--split-per-abi --ci --target aarch64`. Release builds strip Rust symbols and use
size-oriented optimization, LTO, one codegen unit and abort-on-panic. Collect a single
APK with `python scripts/native-artifacts.py
android-abi/arm64 --output native-artifacts/android-arm64-release`. Replace
`arm64` with `armv7`, `i686` or `x86_64` for the other supported targets. The
collector maps public `armv7`/`i686` names to Tauri's `arm`/`x86` output folders.

Shared preparation and packaging scripts live in `android/`. They configure SDK 36,
AndroidX, optional camera support, notification permission, payment links and OS backup
exclusions. Existing Android project changes are retained and incompatible templates
fail before building. Camera permission is requested through the normal runtime prompt.

On Windows without symbolic-link privileges, the packaging script handles only Tauri's
specific failure after a successful Rust debug build. It verifies the reported library
path and checksum before copying that library into the generated app and packaging it.
Other failures remain errors; no Windows policy is changed.

## Linux, macOS and iOS

Build on the matching desktop OS using `pnpm native:linux:build` or
`pnpm native:macos:build`. Linux requires Tauri's WebKitGTK prerequisites, a Secret
Service provider for protected credentials, and XDG Desktop Portal with a GTK/KDE
backend for backup pickers. The Debian package recommends those runtime services.
macOS uses the system Keychain and requires Xcode tools.

macOS commands generate the bundled ICNS icon from `public/arkade-icon-512.png`.
Generated icons remain under the ignored `src-tauri/icons/` directory.

On macOS with Xcode, `pnpm native:ios:init` generates and prepares the iOS project.
`pnpm native:ios:prepare --check` verifies metadata without rewriting it, and
`pnpm native:ios:build` builds it. See [ios/README.md](ios/README.md) for the signed
simulator host used by real Keychain tests and the separate distribution-signing gate.

## Boundaries

Native APIs require the bundled `main` window and a permitted local origin. Remote
frames are blocked, and external HTTPS links and the DFX purchase flow open the system
browser. The host marker is restricted to the main local frame. SQL access retains its
stricter bundled-origin policy.

Software credentials use the platform credential vault, with no plaintext fallback.
Android OS backups exclude wallet data; recovery uses the explicit encrypted export
flow. Background reminders store public expiry deadlines and do not sign transactions.

Run `pnpm test:native`, `pnpm test:native:platforms` and
`cargo test --manifest-path src-tauri/Cargo.toml --workspace --locked` for host checks.
Build and simulator results do not establish installed-app, camera, OS association or
distribution-signing behavior on a physical device.
