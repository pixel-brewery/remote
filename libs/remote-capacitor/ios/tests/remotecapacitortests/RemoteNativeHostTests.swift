// #region Imports
import WebKit
import XCTest
@testable import RemoteCapacitor
// #endregion

@MainActor final class RemoteNativeHostTests: XCTestCase {
    func testClosingTheActiveViewRemovesOnlyItsCapability() async throws {
        // Arrange
        let assets = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: assets, withIntermediateDirectories: true)
        var views: [URL?] = []
        let host = try RemoteNativeHost(configuration: try RemoteNativeConfiguration(appId: "example", assetsDirectory: assets, routes: []), activateView: { views.append($0) })
        addTeardownBlock { await host.dispose(); try? FileManager.default.removeItem(at: assets) }
        // Retain the data store itself; its cookie store does not keep an ephemeral store alive.
        let dataStore = WKWebsiteDataStore.nonPersistent(), store = dataStore.httpCookieStore, origin = URL(string: "http://127.0.0.1:4242")!
        let capability = String(repeating: "a", count: 64)
        // Act
        try await host.activate(RemoteNativeRuntime.Activation(view: ["origin": origin.absoluteString, "connectionId": "selected"], cookie: capability), store: store)
        let installed = await store.allCookies().filter { $0.name == "remote_local" }
        try await host.close(connectionId: "unrelated")
        let retained = await store.allCookies().filter { $0.name == "remote_local" }
        try await host.close(connectionId: "selected")
        let remaining = await store.allCookies().filter { $0.name == "remote_local" }
        // Assert
        XCTAssertEqual(installed.map(\.value), [capability])
        XCTAssertEqual(retained.map(\.value), [capability])
        XCTAssertTrue(remaining.isEmpty)
        XCTAssertFalse(HTTPCookieStorage.shared.cookies(for: origin)?.contains { $0.name == "remote_local" } ?? false)
        XCTAssertNil(host.localOrigin)
        XCTAssertEqual(views, [origin, nil])
        withExtendedLifetime(dataStore) {}
    }
}
