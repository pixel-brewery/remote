// #region Imports
import XCTest
import NIOConcurrencyHelpers
@testable import RemoteCapacitor
// #endregion

final class RemoteUploadStreamTests: XCTestCase {
    func testFoundationBoundStreamTransfersIncrementallyWithBackpressure() throws {
        // Arrange
        let upload = RemoteUploadStream(), capacity = DispatchSemaphore(value: 0), finished = expectation(description: "Foundation consumes original upload bytes")
        upload.onCapacity = { capacity.signal() }; upload.start()
        let expected = 524_288, received = NIOLockedValueBox(Data())
        DispatchQueue.global(qos: .utility).async {
            upload.input.open(); defer { upload.input.close(); finished.fulfill() }
            var bytes = [UInt8](repeating: 0, count: 8192)
            while true { let count = upload.input.read(&bytes, maxLength: bytes.count); if count <= 0 { break }; received.withLockedValue { $0.append(contentsOf: bytes.prefix(count)) } }
        }
        // Act
        for _ in 0..<32 { while capacity.wait(timeout: .now()) == .success {}
            let canRead = try upload.push(Data(repeating: 42, count: 16_384)); if !canRead { XCTAssertEqual(capacity.wait(timeout: .now() + 2), .success) } }; upload.finish()
        wait(for: [finished], timeout: 10)
        // Assert
        let bytes = received.withLockedValue { $0 }; XCTAssertEqual(bytes.count, expected); XCTAssertEqual(bytes, Data(repeating: 42, count: expected)); upload.close()
    }
    func testCancellationRejectsFutureChunksWithoutUnboundedQueueing() {
        // Arrange
        let upload = RemoteUploadStream(); upload.start(); upload.close()
        // Act / Assert
        XCTAssertThrowsError(try upload.push(Data(repeating: 1, count: 1)))
    }
}
