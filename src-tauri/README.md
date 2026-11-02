# Arkade native host

This preparatory layer adds a Tauri host and native services around the existing bundled wallet frontend. It preserves the web frontend and published SDK dependency. The shared-wallet integration is a separate layer: this host alone does not expose native onboarding, hardware signing, secure storage migration, QR scanning or native settings in the wallet UI. Do not treat this branch as a complete native wallet release.

The host loads the local production build, never a remote wallet website with native permissions. Its three plugins provide Satochip transport, wallet platform services and SQLite storage. The wallet integration can consume these services through the existing shared frontend without maintaining another wallet application.

## Windows

Install Rust's MSVC toolchain, Microsoft C++ build tools, Python 3 for the sidecar build, the repository's Node/pnpm versions and the PC/SC reader driver. The packaged app does not require Python or Node.

```powershell
pnpm install --frozen-lockfile
powershell -ExecutionPolicy Bypass -File src-tauri/scripts/build-sidecar.ps1
pnpm native:dev
```

`pnpm native:build` packages an NSIS installer. The sidecar build uses a project-local virtual environment and pinned requirements, then bundles Python, pysatochip and pyscard. Rebuild it after changing `resources/bridge.py`. Build products, generated projects, copied Tauri framework sources and Python caches are excluded from version control.

## Android

Install Android SDK/NDK and the Rust target required by Tauri. Run `pnpm native:android:init` once to generate and prepare the local Android project, then `pnpm native:android` or `pnpm native:android:build --debug --apk --target aarch64`.

The Satochip plugin uses the pinned Java connector over native `IsoDep`, rather than browser Web NFC. Its README records the connector source and transport checks. Actual NFC behavior and signing require validation with a physical phone and card; fixtures and emulator builds do not establish hardware support.

## Linux, macOS and iOS

Desktop builds must run on the matching OS and architecture: use `pnpm native:linux:build` or `pnpm native:macos:build`. These commands build the sidecar before the host. Linux requires WebKitGTK 4.1, PC/SC development libraries, SWIG and a Secret Service provider; macOS requires Xcode tools and SWIG.

On macOS with Xcode, `pnpm native:ios:init` generates and prepares the iOS project. `pnpm native:ios:prepare --check` checks its metadata without rewriting it, and `pnpm native:ios:build` builds it. See `ios/README.md` for entitlements and device constraints. Apple builds and hardware validation remain required gates; source support does not establish successful Apple validation.

## Trust and service boundaries

Only the bundled `main` window receives native permissions. The host blocks frames and sends allowed external links to the system browser. There is no remote-origin capability or general shell API. The iOS capability exposes a bounded APDU transport to the bundled wallet adapter; it does not enforce an opcode allowlist. Card methods accept bounded inputs, and signing flows revalidate the signing key. Card setup and PIN verification require explicit caller actions; the host does not initialize a card at startup.

The wallet service plugin owns platform vault, backup transfer, clipboard, links, lifecycle and notification services. The SQLite plugin exposes bounded wallet storage operations. UI policy, transaction construction and SDK identities belong to the integration layer, rather than these platform transports.

## Checks

```sh
pnpm test:native
pnpm test:native:platforms
cargo test --manifest-path src-tauri/Cargo.toml --workspace --locked
python src-tauri/scripts/collect-licenses.check.py
```

Build the desktop sidecar before the full Rust workspace check, because Tauri validates bundled resources. Native CI exercises matching Linux/macOS builds and iOS simulator builds. It does not establish physical reader, card, Android NFC or iPhone NFC behavior.
