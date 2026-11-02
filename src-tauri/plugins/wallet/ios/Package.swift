// swift-tools-version:5.3
import PackageDescription

let package = Package(
    name: "tauri-plugin-wallet",
    platforms: [.iOS(.v14)],
    products: [.library(name: "tauri-plugin-wallet", type: .static, targets: ["tauri-plugin-wallet"])],
    dependencies: [.package(name: "Tauri", path: "../.tauri/tauri-api")],
    targets: [
        .target(name: "tauri-plugin-wallet", dependencies: [.byName(name: "Tauri")], path: "Sources"),
        .testTarget(name: "WalletPluginTests", dependencies: ["tauri-plugin-wallet"], path: "Tests"),
    ]
)
