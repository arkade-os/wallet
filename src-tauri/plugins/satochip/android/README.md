# Android Satochip transport

The plugin uses Android `IsoDep` and the platform-independent core of official
[Satochip Java 0.3.6](https://github.com/Toporin/Satochip-Java/tree/ad297f14d1dbc0bb6f09e6ba17ca468f945d2a62).
The Gradle source task verifies the pinned archive SHA256 before compiling it.
It does not depend on JitPack or the upstream Android AAR, which includes unrelated
Bluetooth and location permissions. The upstream Apache-2.0 license ships in
`src/main/resources/META-INF/LICENSE-satochip-java.txt`.

`inspect` scans and reads public card status without a PIN, keeping the channel
available for setup or connection. `connect` accepts a PIN from the bundled app's
connection sheet; callers omitting it retain the native PIN dialog fallback.
Keep the card in place while signing. PIN verification occurs once; cached PINs
are cleared before later card operations. Each signature derives the fixed test
key `m/86'/1'/0'/0/0`, checks it against the connection key, applies its Taproot
tweak where needed, and signs on that same card session. App pause, cancellation,
transport errors, policy changes, or a different key close the session. `setup`
initializes a confirmed empty card and imports a backed-up BIP39 seed over the
secure channel. It refuses seeded cards and preserves an existing PIN/PUK during
partial setup. Reset, seed export and existing-PIN changes are not exposed.

While connected and idle, the plugin checks card status every 1.5 seconds on the
same executor used for signing. Checks cannot run between derive, tweak, and
sign. A failed check closes the session and emits `disconnected`; the frontend
must require an explicit connection again. This uses an actual bounded status
APDU because Android's `IsoDep.isConnected` alone does not establish continued
physical presence. Detection can wait for a running operation or NFC timeout.
Phone-specific RF removal and reconnection still require a physical-device test.

The minimum applet is 0.16-0.1. Signing requires completed setup and seed import,
2FA disabled, and Schnorr and untweaked signing policies enabled.
The SDK validates returned signatures separately. A successful build and JVM
tests do not establish real NFC compatibility with a particular phone or card.

## Build

Install JDK 21, the Android SDK platform 36/build tools, NDK 27.2.12479018, and the
Rust Android targets. These can all live in a project-specific toolchain folder;
set `JAVA_HOME`, `ANDROID_HOME`, `NDK_HOME`, and optionally `RUSTUP_HOME` only in
the build process environment. The Tauri CLI's `android init` installs missing
Rust targets under the selected `RUSTUP_HOME`.

Use the official [Temurin JDK](https://adoptium.net/temurin/releases/?version=21),
[Android command-line tools](https://developer.android.com/studio#command-tools),
and [Rust toolchains](https://rust-lang.org/tools/install/). With a chosen local
toolchain directory, keep the SDK, NDK, Android user data, Gradle cache, and Rust
installation there. For example, in the current PowerShell process:

```powershell
$env:JAVA_HOME = 'C:\path\to\toolchains\jdk-21'
$env:ANDROID_HOME = 'C:\path\to\toolchains\android-sdk'
$env:NDK_HOME = "$env:ANDROID_HOME\ndk\27.2.12479018"
$env:ANDROID_USER_HOME = 'C:\path\to\toolchains\android-user'
$env:GRADLE_USER_HOME = 'C:\path\to\toolchains\gradle-home'
$env:RUSTUP_HOME = 'C:\path\to\toolchains\rustup'
$env:RUSTUP_TOOLCHAIN = '1.96.0'
rustup toolchain install 1.96.0 --profile minimal --target aarch64-linux-android
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\android.exe" --no-metrics --sdk=$env:ANDROID_HOME sdk install platforms/android-36 build-tools/36.0.0 ndk/27.2.12479018
```

Replace the example paths with the unpacked toolchain paths. Current Android CLI
uses slash-separated package names; older `sdkmanager` releases use semicolons.
No global environment variables, Windows Developer Mode, or phone configuration
changes are required to compile the debug APK through the guarded copy fallback.

From the wallet root, run:

```powershell
pnpm native:android:init
pnpm native:android:build --debug --apk --target aarch64
```

`prepare-host.mjs` checks the generated Tauri template before using the tested
stable Android SDK 36 and declaring optional camera access for the existing QR
scanner. Wry retains its normal camera runtime permission handling. Unexpected
template or SDK settings fail before files are changed. The generated host is
build output; the wallet frontend remains the normal repository's build.

On Windows without Developer Mode, Tauri may finish compiling Rust but fail to
create its native-library symlink. `build-host.mjs` handles only that exact failure
for an explicitly selected ARM64 or x86_64 debug APK. It verifies the library path reported
by the completed Rust build, copies it with a matching SHA256, and runs Gradle
packaging without rebuilding Rust. Other errors still fail. The APK directory
receives `native-build-receipt.json` containing the library modification time and
library/APK SHA256 hashes. No Windows policy is changed.

## Checks

With the generated Tauri Android host and SDK available:

```powershell
node --test src-tauri/plugins/satochip/android/prepare-host.check.mjs src-tauri/plugins/satochip/android/build-host.check.mjs
cd src-tauri/gen/android
./gradlew.bat :tauri-plugin-satochip:compileDebugKotlin :tauri-plugin-satochip:testDebugUnitTest
```

The exact plugin Gradle project name is recorded in generated `tauri.settings.gradle`.
`CardSessionTest` checks firmware/policy validation before authentication, one PIN
attempt, transient derive/tweak/sign ordering, changed-card refusal, defensive key
copies, and finite APDU retry budgets using connector fixtures.
