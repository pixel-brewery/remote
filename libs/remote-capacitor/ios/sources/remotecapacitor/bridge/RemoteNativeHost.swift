// #region Imports
import Foundation
import WebKit
// #endregion

/// Application-lifetime owner shared by bridge recreations, never a JavaScript-configurable singleton.
///
/// The view capability is a session cookie in the bridge's WebKit data store. Capacitor iOS does not clear
/// session cookies when a bridge is recreated, so it survives the activation's own recreation; closing,
/// forgetting or disposing removes it again, also from the shared jar Capacitor mirrors WebKit cookies into.
@MainActor public final class RemoteNativeHost {
    internal static var installed: RemoteNativeHost?
    internal let runtime: RemoteNativeRuntime
    internal var localOrigin: URL?
    private var _connectionId: String?
    private var _cookie: (value: HTTPCookie, store: WKHTTPCookieStore)?
    internal let activateView: (URL?) throws -> Void
    /// Install once during native application launch. The callback recreates the Capacitor bridge with its new serverURL.
    public init(configuration: RemoteNativeConfiguration, activateView: @escaping (URL?) throws -> Void) throws { guard Self.installed == nil else { throw RemoteNativeError.invalidRequest }; runtime = try RemoteNativeRuntime(configuration: configuration); self.activateView = activateView; Self.installed = self }
    /// Explicitly cancel the application-owned remote channel and remove the active view capability when its native owner exits.
    public func dispose() async { await runtime.dispose(); localOrigin = nil; _connectionId = nil; await removeCookie(); if Self.installed === self { Self.installed = nil } }
    internal func close(connectionId: String) async throws { guard _connectionId == connectionId else { return }; localOrigin = nil; _connectionId = nil; await removeCookie(); try activateView(nil) }
    internal func activate(_ activation: RemoteNativeRuntime.Activation, store: WKHTTPCookieStore) async throws {
        guard let origin = activation.view["origin"] as? String, let url = URL(string: origin), url.host == "127.0.0.1" else { throw RemoteNativeError.invalidRequest }
        let cookie = try makeRemoteLocalCookie(origin: url, capability: activation.cookie)
        // Cookies are not port-scoped: the new capability replaces the closed gateway's cookie of the same name.
        await store.setCookie(cookie); _cookie = (cookie, store); localOrigin = url; _connectionId = activation.view["connectionId"] as? String; try activateView(url)
    }
    /// Removes the closed view capability from its WebKit store and from HTTPCookieStorage.shared.
    private func removeCookie() async {
        guard let installed = _cookie else { return }
        _cookie = nil
        await installed.store.deleteCookie(installed.value)
        HTTPCookieStorage.shared.deleteCookie(installed.value)
    }
}
