// #region Imports
import XCTest
@testable import RemoteCapacitor
// #endregion

final class RemoteProtocolContractTests: XCTestCase {
    func testCanonicalZodVectorsMatchTheNativeValidator() throws {
        // Arrange
        let contract = try RemoteProtocolContract(), vectors = contract.bundle["vectors"] as! [[String: Any]]
        // Act / Assert
        for vector in vectors { let actual = (try? contract.validate(vector["schema"] as! String, vector["value"] as! [String: Any])) != nil; XCTAssertEqual(actual, vector["valid"] as! Bool, vector["name"] as! String) }
    }
    func testPrivatePeerGateRejectsAmbiguousAndPublicDestinations() {
        // Arrange
        let rejected = ["http://127.0.0.1:1234", "http://8.8.8.8", "http://192.168.1.2.evil.test", "http://192.168.001.2", "http://[::ffff:192.168.1.1]", "http://user@192.168.1.1", "http://192.168.1.1/secret"]
        // Act / Assert
        for value in rejected { XCTAssertThrowsError(try RemotePeerPolicy.origin(value), value) }; XCTAssertNoThrow(try RemotePeerPolicy.origin("http://192.168.1.2:4421"))
    }
}
