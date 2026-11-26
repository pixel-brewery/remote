// #region Imports
import XCTest
@testable import RemoteCapacitor
// #endregion

final class RemoteRouteMatcherTests: XCTestCase {
    func testCanonicalRegistryVectorsHaveIdenticalNativeAdmission() throws {
        // Arrange
        let vectors = try RemoteProtocolContract().bundle["routeMatchVectors"] as! [[String: Any]]
        // Act / Assert
        for vector in vectors {
            let routes = try (vector["routes"] as! [[String: Any]]).map { value in try RemoteNativeConfiguration.Route(id: value["id"] as! String, method: value["method"] as! String, path: value["path"] as! String, kind: value["kind"] as! String, capabilities: []) }
            let actual = RemoteRouteMatcher.match(routes, method: vector["method"] as! String, path: vector["path"] as! String)?.id
            XCTAssertEqual(actual, vector["operationId"] as? String, vector["name"] as! String)
        }
    }
}
