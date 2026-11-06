#!/usr/bin/env bash
set -euo pipefail

source_root=$(cd "$(dirname "$0")/.." && pwd)
test_root=$(mktemp -d /tmp/arkade-satochip-swift.XXXXXX)
trap 'rm -rf -- "$test_root"' EXIT
cp -R "$source_root/Sources" "$test_root/Sources"
cp -R "$source_root/Tests" "$test_root/Tests"
cp "$source_root/Package.swift" "$test_root/Package.swift"
cat > "$test_root/PurePackage.swift" <<'SWIFT'
// swift-tools-version:5.7
import PackageDescription
let package = Package(name: "tauri-plugin-satochip", targets: [
    .target(name: "tauri-plugin-satochip", path: "Sources"),
    .testTarget(name: "SatochipNFCTransportTests", dependencies: ["tauri-plugin-satochip"], path: "Tests")
])
SWIFT

tar -C "$test_root" -cf - . | docker run --rm -i --network none --cap-drop ALL \
    --security-opt no-new-privileges \
    swift@sha256:1a1c10372d9c6c0ba9b6151085e0a26ee83a79968b3c738a47a70eac1a70bba4 \
    /bin/sh -ec 'mkdir /work; tar --no-same-owner -xf - -C /work; swift package dump-package --package-path /work >/tmp/native-package.json; echo "Native package manifest parsed"; cp /work/PurePackage.swift /work/Package.swift; swift test --package-path /work'
