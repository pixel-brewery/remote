/// Extends only explicitly selected HTTPS directives for trusted packaged assets.
internal enum RemoteContentSecurityPolicy {
    static func packaged(_ policy: [String: Bool]) -> String {
        func permission(_ key: String) -> String { policy[key] == true ? " https:" : "" }
        return "default-src 'self'; script-src 'self'; connect-src 'self'\(permission("allowHttpsConnections")); img-src 'self' data:\(permission("allowHttpsImages")); media-src 'self'\(permission("allowHttpsMedia")); style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
    }
}
