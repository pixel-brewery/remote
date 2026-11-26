// #region Imports
import Foundation
// #endregion

/// Product-owned immutable policy installed natively before creating the Capacitor bridge.
public struct RemoteNativeConfiguration {
    public let appId: String
    public let assetsDirectory: URL
    public let routes: [Route]
    /// App-owned optional HTTPS resource permissions, checked against the generated canonical schema.
    public let contentPolicy: [String: Bool]
    /// Exact product route admission. Request quota defaults to 1 MiB and is configurable up to 64 MiB; body buffering remains bounded independently.
    public struct Route {
        public let id: String
        public let method: String
        public let path: String
        public let kind: String
        public let capabilities: Set<String>
        public let maxRequestBytes: Int
        public init(id: String, method: String, path: String, kind: String, capabilities: Set<String>, maxRequestBytes: Int = 1_048_576) throws { guard ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"].contains(method), ["http", "sse", "websocket"].contains(kind), (0...67_108_864).contains(maxRequestBytes) else { throw RemoteNativeError.invalidRequest }; try RemoteRouteMatcher.validate(path); self.id = id; self.method = method; self.path = path; self.kind = kind; self.capabilities = capabilities; self.maxRequestBytes = maxRequestBytes }
    }
    public init(appId: String, assetsDirectory: URL, routes: [Route], contentPolicy: [String: Bool] = [:]) throws { guard appId.range(of: "^[a-z][a-z0-9.-]{0,79}$", options: .regularExpression) != nil, assetsDirectory.isFileURL, routes.allSatisfy({ $0.path != "/__remote" && !$0.path.hasPrefix("/__remote/") }), Set(routes.map { route in route.method + " " + route.path.split(separator: "/", omittingEmptySubsequences: false).map { $0.hasPrefix(":") ? ":parameter" : String($0) }.joined(separator: "/") }).count == routes.count else { throw RemoteNativeError.invalidRequest }; _ = try RemoteProtocolContract().validate("remoteContentPolicy", contentPolicy.mapValues { $0 as Any }); self.appId = appId; self.assetsDirectory = assetsDirectory.resolvingSymlinksInPath(); self.routes = routes; self.contentPolicy = contentPolicy }
}
