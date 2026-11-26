// #region Imports
import XCTest
@testable import RemoteCapacitor
// #endregion

final class RemoteContentSecurityPolicyTests: XCTestCase {
    func testDefaultAssetsDoNotAdmitPublicHttpsResources() {
        // Arrange / Act
        let policy = RemoteContentSecurityPolicy.packaged([:])
        // Assert
        XCTAssertFalse(policy.contains("https:")); XCTAssertTrue(policy.contains("script-src 'self';")); XCTAssertTrue(policy.contains("frame-ancestors 'none'"))
    }
    func testImageOptInDoesNotGrantMediaConnectionsOrScripts() {
        // Arrange / Act
        let policy = RemoteContentSecurityPolicy.packaged(["allowHttpsImages": true])
        // Assert
        XCTAssertTrue(policy.contains("img-src 'self' data: https:;")); XCTAssertTrue(policy.contains("media-src 'self';")); XCTAssertTrue(policy.contains("connect-src 'self';")); XCTAssertTrue(policy.contains("script-src 'self';")); XCTAssertEqual(policy.components(separatedBy: "https:").count - 1, 1)
    }
    func testAllResourceOptInsStillDoNotAdmitScriptsOrObjects() {
        // Arrange / Act
        let policy = RemoteContentSecurityPolicy.packaged(["allowHttpsImages": true, "allowHttpsMedia": true, "allowHttpsConnections": true])
        // Assert
        XCTAssertEqual(policy.components(separatedBy: "https:").count - 1, 3); XCTAssertTrue(policy.contains("script-src 'self';")); XCTAssertTrue(policy.contains("object-src 'none';"))
    }
}
