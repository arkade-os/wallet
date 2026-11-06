# Satochip signing

This feature adds Satochip to the shared [native software wallet](native-wallet.md).
Desktop uses PC/SC smart-card readers; Android and supported iPhones use native NFC.
The browser wallet does not expose these transports. The wallet implements the SDK's
existing `Identity` contract directly on published SDK 0.5.4 / swap 0.1.4.

## Connect and unlock

Open the native app and choose **Connect Satochip**. Insert the card in a desktop
reader or hold it against an NFC-capable Android phone or iPhone. The connection sheet reads
its public status, then accepts the PIN in the bundled app. PINs are cleared after
each attempt and are never saved. The browser wallet has no card access.

On Android, tap once to read the public card status, then remove the card while entering
the PIN. Choose **Connect and continue**, lift and tap the card again, and keep it in
place until connected. Authentication uses a fresh NFC connection instead of reusing
the inspection connection across PIN entry. Each explicit PIN verification can send
at most one raw or encrypted PIN command; secure-channel reset responses never cause
an automatic PIN retry.

While the Android connection is pending, the disabled button says **Tap card again
and hold**. Lift the card away if it is still touching the phone, then tap it again;
entering the PIN does not itself trigger a new NFC discovery. Cancel remains available,
and a scan without a new card discovery times out after 45 seconds.

Connection errors identify card selection, status, secure-channel setup, PIN verification
or public-key reading. A failure before verification says the PIN was not checked;
an uncertain verification result does not claim that no attempt occurred. Known wrong
or blocked PIN responses are reported separately. Reader ownership is retained through
the inspection/authentication handoff; terminal cleanup asks Android to ignore the held
tag until removal before releasing it, to reduce unintended NDEF link launches. That
last suppression depends on the phone and tag; see Android's
[reader-mode and ignore APIs](https://developer.android.com/reference/android/nfc/NfcAdapter).

Revealed password fields remask on background; each form keeps its existing policy
for clearing or retaining the value.
Unsubmitted PIN and confirmation fields also clear when the app backgrounds or the
page becomes hidden. Enter them again to continue; setup recovery details and progress
remain available.

On iPhone, inspecting the card closes the system NFC sheet before PIN entry. Each
signing operation then asks for the PIN in the app, opens NFC, checks the wallet's
card key, signs the complete batch, and closes NFC. The PIN is never cached between
taps. A gray connectivity dot between taps is expected; public wallet state stays
available. Cancellation, backgrounding or an uncertain NFC shutdown aborts signing
and cancels queued signing requests. A later explicit action can try again.

An empty card opens the setup flow: create recovery words, save them and the PIN
recovery code, then choose and confirm a PIN. Initialization requires an explicit
confirmation and refuses to replace an existing seed. A card with a PIN but no seed
keeps its existing PIN and recovery code. Setup secrets remain in memory only.
If tap-card setup is interrupted, recovery details remain available and setup stays
blocked until you choose **Check card again**. The app checks whether setup already
finished before allowing another attempt; it does not reopen NFC automatically.

A fresh native profile defaults to Mutinynet. Satochip signing is restricted to
test networks and a static key in this integration. Existing profiles keep their
configured server. The app refuses to replace an existing software wallet, switch
to another card, or rebind a saved card wallet to a different network implicitly.

The saved wallet record contains the card's compressed public key, provider name
and network. Relaunching opens public wallet state without a card or PIN. A small dot
beside the logo is green while connected, amber while connecting, and gray while
disconnected. Balance, history and addresses remain accessible. **Send** opens the
connection or PIN sheet when the card is needed, and signing rechecks the same card. Removing
the card pauses its payment drive, and reconnecting never silently resumes signing.
**Lock wallet** explicitly closes the wallet view and releases runtime resources while
preserving repositories. **Open wallet** restores public read access. Reset clears app
data; it never resets or erases the card.

## Signing and pending payments

Hardware wallets disable automatic SDK settlement;
boarding or renewal must be initiated explicitly while the card is available.

Saved hardware swaps restore without starting a signing pass. **Resume pending payments**
in **Settings > Advanced** explicitly starts their claims and refunds. Accepting a
new payment or swap also starts the same SDK drive before funding, so an accepted
payment is monitored. Locking stops the client. Keep the card available until the
operation finishes.

Server-issued Lightning addresses currently require deterministic ECDSA signatures.
This card identity does not provide that capability, so authenticated LNURL account
setup and automatic LNURL history synchronization are disabled without requesting
card signatures. The receive screen explains the limit and retains direct Arkade,
Bitcoin boarding and Lightning invoice receive options.

Backgrounding, locking or losing the card stops its payment driver. Reconnecting or
returning to the app never silently authorizes signing; resume payment work explicitly.
The PIN is entered in the bundled app and retained only for the current operation.

## Recovery

Keep the recovery phrase and PIN recovery code saved during card setup. Neither
can be exported from the wallet. The hardware settings screen replaces software
seed export and password-change controls with card recovery guidance.

Some swap recovery secrets are persisted in app storage because the card does
not advertise deterministic signing. The card's recovery phrase alone cannot
reconstruct those secrets. Keep app data intact while a payment or swap remains
unfinished. Do not interpret the public card binding as a backup of wallet data.

**Settings → Backup → Export encrypted wallet backup** captures core SQLite state,
plugin IndexedDB records, public wallet settings and already encrypted software
credentials. Export pauses and drains payment processing, then locks the runtime before
collecting the snapshot. Choose a separate password of at least 12 characters. Neither
the Satochip PIN nor its recovery phrase enters the backup.
Backgrounding the app clears typed backup passwords from the export and restore forms.
An already submitted backup operation continues with its confirmed password.

Restore from **Other login options → Restore encrypted wallet backup** in an empty app
profile. Software wallets still need their original wallet password; Satochip wallets need
the matching card. Interrupted imports block normal startup and can resume with the same
backup file. Device-bound biometric credentials must be changed to a wallet password before
export. Android system backup and device transfer explicitly exclude wallet app data and
Keystore ciphertext; keep the encrypted file and recovery details yourself.
During interrupted-restore recovery, Android Back closes an idle password sheet and
clears its entries. A submitted restore keeps ownership until the file operation ends.
Backgrounding clears unsubmitted backup passwords here too, before the wallet opens.
iOS also excludes wallet application directories from automatic system backups and
device-only Keychain items do not transfer. Use the explicit encrypted export flow.

## Platform builds

Build on the matching OS and architecture. The desktop Satochip helper is a pinned
Python application packaged with PyInstaller; it cannot be cross-compiled. Android
uses its existing native Java client. iOS uses a shared TypeScript protocol port of
the pinned Apache-licensed Java client over a small Core NFC APDU transport.

| Platform | OS vault | Card transport | Build |
| --- | --- | --- | --- |
| Windows | Credential Manager | PC/SC reader | `pnpm native:build` |
| Linux | Secret Service | PC/SC reader | `pnpm native:linux:build` |
| macOS | Keychain | PC/SC reader | `pnpm native:macos:build` |
| Android | Keystore | ISO-DEP NFC | `pnpm native:android:build` |
| iOS 14+ | Keychain | Core NFC on supported iPhones | `pnpm native:ios:init`, then `pnpm native:ios:build` |

Linux needs a running, unlocked Secret Service with a default collection, PC/SC and
the reader's driver for card use, and a desktop file portal for backup dialogs.
No keyring fallback writes wallet credentials to a plaintext file. Desktop builds
need Python development tools, SWIG and PC/SC headers to build the helper. See the
platform workflow for build dependencies. iOS initialization preserves an existing
Xcode project and merges the camera/NFC usage descriptions, card AID, URL schemes
and NFC entitlement without replacing unrelated metadata.

Apple builds require macOS/Xcode. The checked-in CI workflow supplies native build
and simulator test gates; its presence is not proof those gates have run. Before
claiming Apple support, verify the bundled WebView's WebCrypto algorithms, software
wallet creation/relaunch, backup pickers, camera, links and lifecycle on Apple
targets, then card signing and cancellation on a physical iPhone. Pure Swift state
tests and protocol fixtures cannot prove Core NFC behavior. No funded payment or
physical hardware compatibility is inferred from native compilation.

## Focused verification

```sh
pnpm exec vitest run src/test/lib/nativeWallet.test.ts src/test/lib/walletRuntime.test.ts src/test/lib/nativeEnvironment.test.ts src/test/providers/wallet-native.test.tsx src/test/providers/config-native.test.tsx src/test/screens/native-card.test.tsx
pnpm exec tsc --noEmit
```

The tests use card and native-host fixtures. They do not prove a physical card
signature, an Android NFC tap, or an end-to-end funded payment.
