# iOS raw NFC bridge

This Tauri plugin provides CoreNFC ISO7816 transport. The shared wallet
`satochipProtocol.ts` owns the Satochip protocol and cryptography. No card
credentials, secure-channel keys, protocol retries, or software signing fallback
are stored in this Swift plugin.

The static product is `tauri-plugin-satochip`; the Rust initializer is
`init_plugin_satochip`. The host must register it through Tauri's
`register_ios_plugin` and keep the existing local-wallet URL guard on every raw
command.

| Command | Arguments | Result |
| --- | --- | --- |
| `open` | none | `{ connected, scanning, reader }` |
| `begin_operation` | none | void |
| `transmit` | `{ commandHex }` | `{ dataHex, statusWord }` |
| `end_operation` | none | void |
| `disconnect` | none | void |
| `cancel` | none | void |
| `status` | none | `{ connected, scanning, reader }` |

The `presence` event uses the status shape and an optional sanitized `reason`
code. `reader` is `iOS NFC`. `USER_CANCELLED` is distinct from `CARD_LOST`,
`CARD_TIMEOUT`, and `APP_BACKGROUNDED`. An intentional disconnect emits
`CARD_DISCONNECTED`; callers must treat that as an expected transport close.

The transport serializes requests, rejects stale session callbacks, detects tag
loss, distinguishes cancellation, expires scans after 45 seconds, and bounds each
explicit operation to 20 seconds and 48 APDUs. `end_operation` ends only the
operation budget; `disconnect` closes the reader. The native transport callbacks
run on a serial queue; plugin events are dispatched to main.
Disconnect/cancel retain the reader in a closing state until CoreNFC confirms
invalidation. A missing callback after three seconds rejects with
`NFC_CLOSE_UNCONFIRMED` and blocks new scans; it never releases reader ownership
on a timer. A later real invalidation permits a fresh explicit action.
`connected` means an ISO7816 transport is available, not that a card has been
authenticated. The protocol client must bind and revalidate its derived public
key before signing and clear its session material on every invalidation.

CoreNFC presents a foreground system sheet. PIN entry must happen before opening
that sheet. Open, authenticate, perform the requested operation, and close the
reader in one guided action. Do not leave the system reader open across wallet
screens or retain the PIN for a later scan. Card loss, cancellation,
backgrounding, and timeout require a fresh explicit action; the transport never
restarts polling or resumes a payment.

The host needs `NFCReaderUsageDescription`, the NFC tag-reader entitlement and
the Satochip AID `5361746F43686970` in
`com.apple.developer.nfc.readersession.iso7816.select-identifiers`. Those settings
are owned by the generated app host.

After Tauri creates `../.tauri/tauri-api`, run `swift test` for the state/budget
and APDU validation tests, then build the native app for an iPhone destination
with Xcode to compile CoreNFC, UIKit, and the Tauri command bridge.
The iOS implementation is excluded from desktop unit-test compilation.
For an isolated Linux check of the same pure sources, use
`bash scripts/verify-state-linux.sh` with Docker. It snapshots the current
sources, substitutes a dependency-free test manifest, and runs the tests in the
pinned official Swift 6.0.3 image without network or host filesystem mounts.
Physical iPhone tests remain necessary for NFC field loss, system-sheet
cancellation, app backgrounding, and late CoreNFC completions. No Apple build or
physical NFC validation has been performed on the Windows development machine.

The official SatochipSwift revision
`63404edd458d2a8c4f430ca2d048ad327fcecbe0` has no tracked license and cannot be
adopted as-is. Its private tweak/internal transmit APIs also prevent a small
external secure-channel wrapper. No code from that project is included here.
The shared TypeScript protocol client references the existing Apache-2.0
Satochip-Java client and uses the wallet's vetted cryptographic dependencies.
