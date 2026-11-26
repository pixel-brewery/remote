// #region Imports
import Foundation
import WebKit
// #endregion

/// Cookie jar that receives the protected view capability; the bridge's `WKHTTPCookieStore` in production.
@MainActor internal protocol RemoteCookieStore: AnyObject {
    /// Installs or replaces one cookie.
    func setCookie(_ cookie: HTTPCookie) async
    /// Removes one cookie.
    func deleteCookie(_ cookie: HTTPCookie) async
}

extension WKHTTPCookieStore: RemoteCookieStore {}
