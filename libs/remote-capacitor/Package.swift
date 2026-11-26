// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PixelBreweryRemote",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "RemoteCapacitor", targets: ["RemoteCapacitor"]),
        .library(name: "PixelBreweryRemoteCapacitor", targets: ["RemoteCapacitor"]),
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.6.2"),
        .package(url: "https://github.com/apple/swift-nio.git", from: "2.83.0"),
        .package(url: "https://github.com/apple/swift-nio-transport-services.git", from: "1.28.0"),
    ],
    targets: [
        .target(name: "RemoteCapacitor", dependencies: [
            .product(name: "Capacitor", package: "capacitor-swift-pm"),
            .product(name: "Cordova", package: "capacitor-swift-pm"),
            .product(name: "NIOCore", package: "swift-nio"),
            .product(name: "NIOConcurrencyHelpers", package: "swift-nio"),
            .product(name: "NIOHTTP1", package: "swift-nio"),
            .product(name: "NIOWebSocket", package: "swift-nio"),
            .product(name: "NIOTransportServices", package: "swift-nio-transport-services"),
        ], path: "ios/sources/remotecapacitor", resources: [.process("resources")]),
        .testTarget(name: "RemoteCapacitorTests", dependencies: ["RemoteCapacitor", .product(name: "NIOConcurrencyHelpers", package: "swift-nio")], path: "ios/tests/remotecapacitortests"),
    ]
)
