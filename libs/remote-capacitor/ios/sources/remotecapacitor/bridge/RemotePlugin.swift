// #region Imports
import Capacitor
import Foundation
import WebKit
import AVFoundation
// #endregion

/// Fixed canonical native control API. All network and credential authority stays in the native host.
@objc(RemotePlugin) public final class RemotePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RemotePlugin"
    public let jsName = "PixelBreweryRemote"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "invoke", returnType: CAPPluginReturnPromise), CAPPluginMethod(name: "scanPairing", returnType: CAPPluginReturnPromise)]
    private var _packagedOrigin: String?
    private var _scanner: RemoteQrViewController?
    override public func load() { _packagedOrigin = bridge?.config.localURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/")) }
    @objc public func invoke(_ call: CAPPluginCall) {
        Task { @MainActor [self] in
            guard trustedDocument(), let host = RemoteNativeHost.installed, let request = call.getObject("request"), let store = webView?.configuration.websiteDataStore.httpCookieStore else { call.reject("Untrusted or unconfigured Remote view.", "forbidden"); return }
            do { let response = try await host.runtime.invoke(request) { activation in try await host.activate(activation, store: store) }; if ["connections.close", "connections.forget"].contains(request["kind"] as? String ?? ""), let connectionId = request["connectionId"] as? String { try await host.close(connectionId: connectionId) }; call.resolve(["response": response]) } catch { call.reject("Remote operation failed: \(error)", "network") }
        }
    }
    @objc public func scanPairing(_ call: CAPPluginCall) {
        Task { @MainActor [self] in
            guard trustedDocument(), _scanner == nil else { call.reject("Untrusted view or scanner already open.", "forbidden"); return }
            let granted = await AVCaptureDevice.requestAccess(for: .video); guard granted else { call.reject("Camera permission was denied.", "forbidden"); return }
            let scanner = RemoteQrViewController { [weak self] raw in self?._scanner = nil; guard let raw else { call.reject("QR scanning was cancelled.", "cancelled"); return }; do { let bootstrap = try RemoteProtocolContract().invitation(raw); call.resolve(["bootstrap": bootstrap]) } catch { call.reject("The QR code is not a Remote invitation.", "invalid-request") } }; _scanner = scanner; bridge?.viewController?.present(scanner, animated: true)
        }
    }
    override public func shouldOverrideLoad(_ navigationAction: WKNavigationAction) -> NSNumber? { MainActor.assumeIsolated { guard let url = navigationAction.request.url else { return true }; return NSNumber(value: !trustedOrigin(url)) } }
    @MainActor private func trustedDocument() -> Bool { webView?.url.map(trustedOrigin) == true }
    @MainActor private func trustedOrigin(_ url: URL) -> Bool { guard url.user == nil, url.password == nil else { return false }; var components = URLComponents(url: url, resolvingAgainstBaseURL: false); components?.path = ""; components?.query = nil; components?.fragment = nil; let origin = components?.string; return origin == _packagedOrigin || origin == RemoteNativeHost.installed?.localOrigin?.absoluteString }
}
