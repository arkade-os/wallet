# iOS wallet services

This static Tauri plugin keeps the existing wallet frontend and SDK. It supplies the Android wallet command protocol through Keychain, UIKit clipboard and share sheets, and document pickers. PIN and Satochip NFC belong to the separate signer plugin.

The two encrypted wallet slots use `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` with synchronization disabled. No plaintext fallback exists. `Library` (including WebKit and application databases) and `Documents` are excluded from automatic system backups when the plugin loads and resumes. Users recover through the wallet's explicit encrypted backup flow. Those encrypted exports are bounded to 32 MiB and validated before any temporary file is written; imported files are bounded and validated before returning them to Rust for a second validation.

Clipboard writes stay on the local device instead of Universal Clipboard. iOS may request paste access on reads. A privacy cover hides the wallet when the app becomes inactive; iOS cannot prevent screenshots taken while the app is active. Lifecycle events pause and resume the shared wallet. Background reminders report `supported: false`; no iOS background signing or scheduling is claimed. Android Back registration is a no-op.

## Integration

- In the Rust plugin build script, use `.ios_path("ios")`.
- Declare `tauri::ios_plugin_binding!(init_plugin_wallet)` and register it through `api.register_ios_plugin(init_plugin_wallet)`.
- Forward validated `tauri::RunEvent::Opened` URLs to the mobile plugin command `receiveIntent` with `{ "url": "..." }`. The command validates links again, emits the existing `intent` event, and retains the pending link for `initialIntent`. Tauri's Swift `Plugin` does not expose an iOS `onNewIntent` override.
- Keep the Rust main-window and local-origin checks. Swift checks the current WKWebView origin again before commands and before returning asynchronous secrets or file contents.
- The package imports the Tauri API supplied by the pinned Rust Tauri dependency at `../.tauri/tauri-api`; it adds no remote Swift package dependencies.

## Validation gates

The implementation follows the installed Tauri 2.12.5 `Plugin`, `Invoke`, `UIUtils`, and `PluginManager` source. This Windows environment has no Apple SDK, so source review and policy checks do not prove an iOS build or device behavior.

On a Mac with Xcode, initialize the Tauri iOS project and build its simulator target with deployment target iOS 14 or newer. Run the package's `WalletPluginTests` test target against an iOS simulator (the package imports UIKit, so host macOS `swift test` is insufficient). The Keychain tests create and delete only UUID-namespaced test items. Verify a fresh software wallet, relaunch and unlock, denied paste access, iPad sheet presentation, share and picker cancellation, encrypted export/import, app-switcher privacy, warm and cold payment links, and failure while the device is locked. Verify app directories carry `isExcludedFromBackup`; reinstall/restore behavior and real-device Keychain access still require Apple-device evidence. No existing credentials or cards are modified by the source-level checks.

API references: [Tauri mobile plugins](https://v2.tauri.app/develop/plugins/develop-mobile/), [Keychain return types](https://developer.apple.com/documentation/security/secitemcopymatching(_:_:)), [device-only unlocked access](https://developer.apple.com/documentation/security/ksecattraccessiblewhenunlockedthisdeviceonly), [document export](https://developer.apple.com/documentation/uikit/uidocumentpickerviewcontroller/init(forexporting:ascopy:)), [file protection](https://developer.apple.com/documentation/uikit/encrypting-your-app-s-files), and [pasteboard privacy options](https://developer.apple.com/documentation/uikit/uipasteboard/setitems(_:options:)).
