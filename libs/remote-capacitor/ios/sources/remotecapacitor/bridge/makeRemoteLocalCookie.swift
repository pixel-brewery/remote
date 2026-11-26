// #region Imports
import Foundation
// #endregion

/// Construct a real HttpOnly, strict same-site HTTP loopback cookie through Foundation's header parser.
internal func makeRemoteLocalCookie(origin: URL, capability: String) throws -> HTTPCookie {
    guard origin.scheme == "http", origin.host == "127.0.0.1", origin.user == nil, origin.password == nil, origin.port != nil,
          capability.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil,
          let parsed = HTTPCookie.cookies(withResponseHeaderFields: ["Set-Cookie": "remote_local=\(capability); Path=/; HttpOnly; SameSite=Strict"], for: origin).first,
          var properties = parsed.properties else { throw RemoteNativeError.invalidRequest }
    // Supplying any .secure value marks a cookie Secure, even the string "FALSE".
    properties.removeValue(forKey: .secure)
    properties[.sameSitePolicy] = HTTPCookieStringPolicy.sameSiteStrict
    guard let cookie = HTTPCookie(properties: properties), cookie.isHTTPOnly, !cookie.isSecure, cookie.sameSitePolicy == .sameSiteStrict else { throw RemoteNativeError.invalidRequest }
    return cookie
}
