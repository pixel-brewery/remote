// #region Imports
import XCTest
@testable import RemoteCapacitor
// #endregion

final class RemoteNativeConfigurationTests: XCTestCase {
    func testAcceptsA64MiBStreamQuotaAndRejectsOneByteMore() throws {
        // Arrange / Act
        let route = try RemoteNativeConfiguration.Route(id: "upload", method: "POST", path: "/api/upload", kind: "http", capabilities: ["write"], maxRequestBytes: 67_108_864)
        // Assert: route metadata does not allocate a body buffer.
        XCTAssertEqual(route.maxRequestBytes, 67_108_864)
        XCTAssertThrowsError(try RemoteNativeConfiguration.Route(id: "upload", method: "POST", path: "/api/upload", kind: "http", capabilities: ["write"], maxRequestBytes: 67_108_865))
    }
}
