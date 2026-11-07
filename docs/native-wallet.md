# Native wallet

Tauri bundles the existing wallet frontend. Send, receive, swaps, assets, coin
control and settings use the same React screens and SDK wallet as the browser app.
Native adapters provide protected credentials, SQLite, camera scanning, sharing,
clipboard, notifications and operating-system lifecycle/link handling.

The wallet and swap extension resolve one published `@arkade-os/sdk` 0.5.4 instance,
with `@arkade-os/swap` 0.1.4. Rebuild the bundled app to distribute frontend updates;
remote pages do not receive native wallet capabilities.

## Software wallets and storage

Create or import a static or HD wallet through the existing onboarding screens.
A fresh native profile defaults to Mutinynet; existing profiles keep their server
and mode. An unsupported saved signer profile blocks onboarding with its data
preserved, rather than being replaced by a new software wallet.

Browser wallets retain `ServiceWorkerWallet`. Tauri uses `ForegroundWallet` around
the same SDK wallet. Clearing the runtime disposes subscriptions without deleting
repositories. Backgrounding pauses the payment driver; foreground return can resume
it. Backup export pauses and drains processing before taking the snapshot.

Password-encrypted credentials receive an additional Android Keystore, Windows
Credential Manager, macOS Keychain or Linux Secret Service layer. iOS items are
non-synchronizing, device-only and accessible while unlocked. Startup fails closed
when the OS vault is unavailable. Credential migration requires verified write and
readback, with no fallback to browser secret storage. Unlock the device/keyring and
retry if storage is unavailable; the error screen preserves wallet data.

Core wallet, contract, intent and virtual-transaction state uses SDK SQLite
repositories with serialized transactions. Existing native IndexedDB core data is
copied and verified before SQLite is selected; the previous database remains until
explicit reset. Swap/LNURL repositories retain IndexedDB and join encrypted backups.

## Native interactions

Android/iOS use the Tauri scanner with the wallet overlay, runtime camera permission,
cancel and retry. Desktop/browser scanning keeps the existing implementation. Cancel
and Android Back discard late scan results, including delayed permission callbacks.
Back follows wallet navigation and payment-request handoff.

Cold/warm bitcoin, lightning, arkade and web+arkade links enter the existing
confirmation flow. Desktop uses Tauri deep-link/single-instance support. OS handler
association requires installation/desktop integration; raw binaries do not register
themselves as defaults. HTTPS App Links/Universal Links need a domain association.
Requests wait behind an active request/sheet and require **Open request**. Handoffs
are held in memory and are not durable across process/document loss. External pages
open outside the privileged WebView; a link never authorizes payment.

Android WorkManager schedules opt-in expiry reminders from public deadlines only;
it never signs, renews or claims swaps. Doze/OS scheduling may delay reminders.
iOS/desktop notifications require an open app; background expiry reminders are not
implemented there. Windows notification delivery requires an installed app, and
Linux needs a desktop notification service.

## Backup and restore

Export an encrypted state backup from native wallet settings. Preserve its password,
the original wallet password and recovery phrase. Device-bound biometric credentials
must become a wallet password before export. A phrase alone does not reconstruct
unfinished swap records and their recovery information.

An empty profile restores through **Other login options → Restore encrypted wallet
backup**. Interrupted imports block startup and can resume from the same file.
Back closes an idle password sheet; submitted imports keep ownership until finished.
Unsubmitted password fields clear on backgrounding; submitted operations continue
with their confirmed password. Signer-bearing backups are not software-wallet backups.

Android system backup/device transfer exclude app data and Keystore ciphertext.
iOS excludes wallet directories from system backup; device-only Keychain items do
not transfer. Keep the encrypted export yourself.

## Builds and validation

Use the matching OS/architecture. See [`src-tauri/README.md`](../src-tauri/README.md).

| Platform | OS vault | Build |
| --- | --- | --- |
| Windows | Credential Manager | `pnpm native:build` |
| Linux | Secret Service | `pnpm native:linux:build` |
| macOS | Keychain | `pnpm native:macos:build` |
| Android | Keystore | `pnpm native:android:init`, then `pnpm native:android:build` |
| iOS 14+ | Keychain | `pnpm native:ios:init`, then `pnpm native:ios:build` |

Shared Android preparation/build scripts live in `src-tauri/android/`. Linux needs
an unlocked Secret Service/default collection and a desktop file portal for backup
dialogs. Apple builds need macOS/Xcode. Native access remains restricted to the local
main window, with remote frames blocked.

Run `pnpm test:unit`, `pnpm exec tsc --noEmit`, `pnpm test:native` and
`pnpm test:native:platforms`, plus web/native frontend and matching host builds.
Native CI covers Linux/macOS builds and iOS compilation/simulator tests, including
real Keychain calls in a signed simulator test host. Physical-device camera/lifecycle,
installed OS associations, distribution signing and funded native payments need
separate release validation.

## CI binary downloads

The **Native platforms** Actions workflow builds on pushes, pull requests and manual
runs. Push/PR runs for the same source branch share a concurrency group, so only the
newest build continues. Download packages from the workflow run's **Artifacts** section.
Artifacts are retained for 14 days and include `SOURCE.json` with the actual build
commit and `SHA256SUMS` for the packaged files.

| Artifact | Packages |
| --- | --- |
| `Arkade-windows-x64` | NSIS installer and MSI |
| `Arkade-linux-x64` | DEB and archived AppImage |
| `Arkade-macos-arm64`, `Arkade-macos-x64` | DMG and archived app bundle |
| `Arkade-android-universal-debug` | Debug APK covering ARM64, ARMv7, x86 and x86_64 |
| `Arkade-ios-simulator` | Archived simulator app |
| `Arkade-ios-unsigned` | Unsigned device IPA |

App bundles and AppImages are archived before upload to preserve executable modes
and symlinks. Every requested package format must exist for upload to succeed.
Desktop packages are unsigned; the IPA needs signing/provisioning before installation.
Android APKs use the runner's debug key, so updates over earlier installations are
not guaranteed. These jobs upload CI artifacts without publishing a release or
configuring distribution credentials.

The stacked [Satochip feature](native-satochip.md) adds card onboarding, signing and
NFC/PC/SC transports to this same wallet frontend.
