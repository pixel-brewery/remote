// #region Imports
import Foundation
import WebKit
// #endregion

/// Application-lifetime owner shared by bridge recreations, never a JavaScript-configurable singleton.
@MainActor public final class RemoteNativeHost {
    internal static var installed: RemoteNativeHost?
    internal let runtime: RemoteNativeRuntime
    internal var localOrigin: URL?
    private var _connectionId: String?
    internal let activateView: (URL?) throws -> Void
    /// Install once during native application launch. The callback recreates the Capacitor bridge with its new serverURL.
    public init(configuration: RemoteNativeConfiguration, activateView: @escaping (URL?) throws -> Void) throws { guard Self.installed == nil else { throw RemoteNativeError.invalidRequest }; runtime = try RemoteNativeRuntime(configuration: configuration); self.activateView = activateView; Self.installed = self }
    /// Explicitly cancel the application-owned remote channel when its native owner exits.
    public func dispose() async { await runtime.dispose(); localOrigin = nil; if Self.installed === self { Self.installed = nil } }
    internal func close(connectionId: String) throws { guard _connectionId == connectionId else { return }; localOrigin = nil; _connectionId = nil; try activateView(nil) }
    internal func activate(_ activation: RemoteNativeRuntime.Activation, store: WKHTTPCookieStore) async throws {
        guard let origin = activation.view["origin"] as? String, let url = URL(string: origin), url.host == "127.0.0.1" else { throw RemoteNativeError.invalidRequest }
        let cookie = try makeRemoteLocalCookie(origin: url, capability: activation.cookie)
        await store.setCookie(cookie); localOrigin = url; _connectionId = activation.view["connectionId"] as? String; try activateView(url)
    }
}
