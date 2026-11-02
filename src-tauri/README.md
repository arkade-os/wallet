# Arkade native host

This Tauri host embeds the existing wallet's production build. Wallet screens, routing, swaps and activity remain in the normal React application; the host contributes card access through the `satochip` plugin. It never loads a remote wallet website with native permissions.

The first host supports Windows PC/SC and Android NFC. It uses the fixed test-coin path `m/86'/1'/0'/0/0`, Satochip applet 0.16-0.1 or later, Schnorr and Nostr policies enabled, and 2FA disabled. Onboarding detects empty cards and guides recovery backup and initialization without replacing an existing seed. Do not use valuable funds.

## Windows

Install Rust's MSVC toolchain, the Microsoft C++ build tools, Python 3 for building the sidecar, the repository's Node/pnpm versions and the PC/SC reader driver. The installed application will not require Python or Node.

```powershell
pnpm install --frozen-lockfile
powershell -ExecutionPolicy Bypass -File src-tauri/scripts/build-sidecar.ps1
pnpm native:dev
```

`pnpm native:build` builds the existing wallet and packages an NSIS installer. `build-sidecar.ps1` uses a project-local virtual environment and pinned requirements, then bundles Python, pysatochip and pyscard into one executable. Rebuild it after changing `resources/bridge.py`.

The executable's `--card-status` diagnostic reads public card status and exits without opening the wallet or asking for a PIN. Rust transport checks run with `cargo test --manifest-path src-tauri/Cargo.toml -p tauri-plugin-satochip`.

The bundled app accepts the card PIN in its connection sheet and clears it after the attempt. The plugin still supports the Windows credential prompt when a caller omits the PIN. There is one PIN attempt per explicit connection. Cancellation or an error closes the helper; retry requires another user action. PINs never enter process command arguments, environment variables, persistent storage or logs. Locking the wallet ends the card process.

For local development, `ARKADE_SATOCHIP_PYTHON` may point to a local Python environment containing the pinned pysatochip dependency if the standalone sidecar has not been built. Release builds require the packaged executable.

## Android

The same host uses a Kotlin plugin and the official Satochip Java core over `IsoDep`. Android SDK/NDK and a physical NFC-capable phone are required. Use `pnpm native:android:init` once to generate and prepare the local Android project, then `pnpm native:android` or `pnpm native:android:build --debug --apk --target aarch64`. The app guides card tapping, setup and PIN entry in its connection sheet. Moving away or backgrounding the app closes the NFC session.

The `plugins/satochip/android` README records the pinned connector source and transport checks. Software fixtures cannot prove that this specific card's antenna works; perform a real connection and signature proof on the phone before funding it.

## Linux, macOS and iOS

Desktop builds must run on the matching OS and architecture: use `pnpm native:linux:build` or `pnpm native:macos:build`. These commands build the sidecar before the host. Linux requires WebKitGTK 4.1, PC/SC development libraries, SWIG and a Secret Service provider; macOS requires Xcode tools and SWIG.

The macOS commands generate the bundled ICNS icon from `public/arkade-icon-512.png` before building. Generated icons stay under the ignored `src-tauri/icons/` directory.

On macOS with Xcode, `pnpm native:ios:init` generates and prepares the iOS project. `pnpm native:ios:prepare --check` checks its metadata without rewriting it, and `pnpm native:ios:build` builds it. See [ios/README.md](ios/README.md) for entitlements, the signed simulator host used by Keychain tests and device constraints. Apple builds and hardware validation remain required gates; source support does not establish successful Apple validation.

## Boundaries

Only the bundled `main` window receives card permissions. There is no remote-origin capability, general shell API or automatic PIN retry. The iOS capability exposes a bounded APDU transport to the bundled wallet adapter; it does not enforce an opcode allowlist. Commands accept bounded inputs and signing flows revalidate the card key. Operations run serially; timeout, card removal, identity change and wallet close discard the session.

Desktop presence is checked every three seconds without signing or sending a PIN, serialized with card operations. Loss invalidates the session and updates the logo dot. Close another wallet's card session before connecting here; concurrent PC/SC clients can reset the applet's transient signing state.

The native host blocks all frames. The existing DFX purchase flow and external HTTPS links open the system browser. This avoids relying on frame-origin attribution in Android WebView's native IPC. The host marker is restricted to the main local frame. Android's manifest declares optional camera support for the existing QR scanner; its normal runtime permission prompt still applies.

The wallet Satochip adapter implements the SDK's existing `Identity` interface directly. Card-specific hash and APDU operations stay behind the native transport boundary, and returned signatures are verified before use. This release does not advertise HD key rotation, private-key export or deterministic signatures. Some swap recovery secrets therefore live in wallet storage; preserve that storage as well as the card recovery phrase.
