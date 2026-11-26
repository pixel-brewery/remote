// #region Imports
import Foundation
import XCTest
@testable import RemoteCapacitor
// #endregion

/// In-memory cookie jar: the case exercises the host's cookie lifecycle without starting WebKit processes.
@MainActor private final class MemoryCookieStore: RemoteCookieStore {
    private(set) var cookies: [HTTPCookie] = []
    func setCookie(_ cookie: HTTPCookie) async { cookies.removeAll { Self.same($0, cookie) }; cookies.append(cookie) }
    func deleteCookie(_ cookie: HTTPCookie) async { cookies.removeAll { Self.same($0, cookie) } }
    private static func same(_ left: HTTPCookie, _ right: HTTPCookie) -> Bool { left.name == right.name && left.domain == right.domain && left.path == right.path }
}

@MainActor final class RemoteNativeHostTests: XCTestCase {
    func testClosingTheActiveViewRemovesOnlyItsCapability() async throws {
        // Arrange
        let assets = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: assets, withIntermediateDirectories: true)
        var views: [URL?] = []
        let host = try RemoteNativeHost(configuration: try RemoteNativeConfiguration(appId: "example", assetsDirectory: assets, routes: []), activateView: { views.append($0) })
        let store = MemoryCookieStore(), origin = URL(string: "http://127.0.0.1:4242")!, capability = String(repeating: "a", count: 64)
        addTeardownBlock { @MainActor in
            await host.dispose(); try? FileManager.default.removeItem(at: assets)
            for cookie in HTTPCookieStorage.shared.cookies(for: origin) ?? [] where cookie.name == "remote_local" { HTTPCookieStorage.shared.deleteCookie(cookie) }
        }
        // Act
        try await host.activate(RemoteNativeRuntime.Activation(view: ["origin": origin.absoluteString, "connectionId": "selected"], cookie: capability), store: store)
        let installed = store.cookies.filter { $0.name == "remote_local" }
        // Capacitor mirrors WebKit cookies into the shared jar, so the capability is present there as well.
        for cookie in installed { HTTPCookieStorage.shared.setCookie(cookie) }
        let mirrored = HTTPCookieStorage.shared.cookies(for: origin)?.contains { $0.name == "remote_local" } ?? false
        try await host.close(connectionId: "unrelated")
        let retained = store.cookies.filter { $0.name == "remote_local" }
        try await host.close(connectionId: "selected")
        let remaining = store.cookies.filter { $0.name == "remote_local" }
        // Assert
        XCTAssertEqual(installed.map(\.value), [capability])
        XCTAssertTrue(mirrored)
        XCTAssertEqual(retained.map(\.value), [capability])
        XCTAssertTrue(remaining.isEmpty)
        XCTAssertFalse(HTTPCookieStorage.shared.cookies(for: origin)?.contains { $0.name == "remote_local" } ?? false)
        XCTAssertNil(host.localOrigin)
        XCTAssertEqual(views, [origin, nil])
    }
}
