// swift-tools-version: 5.7
import PackageDescription

let package = Package(
    name: "tauri-plugin-satochip",
    platforms: [.iOS(.v14)],
    products: [.library(name: "tauri-plugin-satochip", type: .static, targets: ["tauri-plugin-satochip"])],
    dependencies: [.package(name: "Tauri", path: "../.tauri/tauri-api")],
    targets: [
        .target(name: "tauri-plugin-satochip", dependencies: [
            .product(name: "Tauri", package: "Tauri", condition: .when(platforms: [.iOS]))
        ], path: "Sources"),
        .testTarget(name: "SatochipNFCTransportTests", dependencies: ["tauri-plugin-satochip"], path: "Tests")
    ]
)
