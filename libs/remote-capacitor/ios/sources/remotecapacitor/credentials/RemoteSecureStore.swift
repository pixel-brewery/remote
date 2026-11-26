// #region Imports
import Foundation
import Security
// #endregion

/// Atomic installation-local Keychain records; no synchronizable or plaintext preferences fallback.
internal final class RemoteSecureStore {
    private let _service: String
    init(appId: String) { _service = "de.pixelbrewery.remote." + appId }
    func read() throws -> [String: Any] {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: _service, kSecAttrAccount as String: "connections", kSecAttrSynchronizable as String: false, kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
        var result: CFTypeRef?; let status = SecItemCopyMatching(query as CFDictionary, &result); if status == errSecItemNotFound { return [:] }
        guard status == errSecSuccess, let data = result as? Data, data.count <= 1_048_576, let value = try JSONSerialization.jsonObject(with: data) as? [String: Any] else { throw RemoteNativeError.persistence }; return value
    }
    func write(_ value: [String: Any]) throws {
        let data = try JSONSerialization.data(withJSONObject: value); guard data.count <= 1_048_576 else { throw RemoteNativeError.persistence }
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: _service, kSecAttrAccount as String: "connections", kSecAttrSynchronizable as String: false]
        let attributes: [String: Any] = [kSecValueData as String: data, kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
        var status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound { status = SecItemAdd(query.merging(attributes) { _, new in new } as CFDictionary, nil) }
        guard status == errSecSuccess else { throw RemoteNativeError.persistence }
    }
}
