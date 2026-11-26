// #region Imports
import XCTest
@testable import RemoteCapacitor
// #endregion

final class RemoteLocalCookieTests: XCTestCase {
    func testNativeCapabilityIsHttpOnlyAndActuallySentOverHttpLoopback() throws {
        // Arrange
        let origin = URL(string: "http://127.0.0.1:4242")!, capability = String(repeating: "a", count: 64)
        // Act
        let cookie = try makeRemoteLocalCookie(origin: origin, capability: capability)
        // Assert
        XCTAssertTrue(cookie.isHTTPOnly); XCTAssertFalse(cookie.isSecure); XCTAssertEqual(cookie.sameSitePolicy, .sameSiteStrict); XCTAssertEqual(cookie.domain, "127.0.0.1"); XCTAssertEqual(cookie.path, "/"); XCTAssertEqual(HTTPCookie.requestHeaderFields(with: [cookie])["Cookie"], "remote_local=" + capability)
    }
    func testCookieBuilderRejectsAuthorityOrHeaderInjection() {
        // Arrange / Act / Assert
        XCTAssertThrowsError(try makeRemoteLocalCookie(origin: URL(string: "http://192.168.1.1:4242")!, capability: String(repeating: "a", count: 64)))
        XCTAssertThrowsError(try makeRemoteLocalCookie(origin: URL(string: "http://127.0.0.1:4242")!, capability: "injected; Path=/"))
    }
}
