// #region Imports
import Foundation
import Darwin
// #endregion

/// Numeric private-address selection, independent of DNS and WebView ATS exceptions.
internal enum RemotePeerPolicy {
    static func origin(_ value: String) throws -> URL {
        guard let parts = URLComponents(string: value), ["http", "https"].contains(parts.scheme ?? ""), let rawHost = parts.host, parts.user == nil, parts.password == nil, parts.path.isEmpty, parts.query == nil, parts.fragment == nil, parts.port == nil || (1...65535).contains(parts.port!) else { throw RemoteNativeError.forbidden }
        let host = rawHost.trimmingCharacters(in: CharacterSet(charactersIn: "[]")); guard !host.contains("%") else { throw RemoteNativeError.forbidden }
        if host.contains(":") {
            var address = in6_addr(); guard inet_pton(AF_INET6, host, &address) == 1 else { throw RemoteNativeError.forbidden }
            let bytes = withUnsafeBytes(of: &address) { Array($0) }; guard bytes[0] & 254 == 252 else { throw RemoteNativeError.forbidden }
        } else {
            let pieces = host.split(separator: ".", omittingEmptySubsequences: false), numbers = pieces.compactMap { UInt8($0) }
            guard pieces.count == 4, numbers.count == 4, zip(pieces, numbers).allSatisfy({ String($0.1) == $0.0 }), numbers[0] == 10 || numbers[0] == 172 && (16...31).contains(numbers[1]) || numbers[0] == 192 && numbers[1] == 168 else { throw RemoteNativeError.forbidden }
        }
        guard let url = parts.url else { throw RemoteNativeError.invalidRequest }; return url
    }
    static func path(_ raw: String) throws -> String {
        guard raw.utf16.count <= 16_384, raw.hasPrefix("/"), !raw.hasPrefix("//"), !raw.contains("\\"), !raw.contains("#"), !raw.unicodeScalars.contains(where: { $0.value <= 32 || $0.value == 127 }) else { throw RemoteNativeError.forbidden }
        let path = String(raw.split(separator: "?", maxSplits: 1, omittingEmptySubsequences: false)[0]); guard path.range(of: "%2f|%5c", options: [.regularExpression, .caseInsensitive]) == nil, let decoded = path.removingPercentEncoding, !decoded.contains("%"), !decoded.contains("?"), !decoded.contains("#"), !decoded.contains("//"), !decoded.contains("\\"), !decoded.split(separator: "/", omittingEmptySubsequences: false).contains(where: { $0 == "." || $0 == ".." }), !decoded.unicodeScalars.contains(where: { $0.value <= 32 || $0.value == 127 }) else { throw RemoteNativeError.forbidden }; return decoded
    }
}
