// #region Imports
import UIKit
import RemoteCapacitor
// #endregion

/// Native lifecycle and immutable product policy for the two mobile acceptance applications.
@main public final class AppDelegate: UIResponder, UIApplicationDelegate {
    public var window: UIWindow?
    private var _remote: RemoteNativeHost?
    public func application(_ application: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        do {
            let kind = Bundle.main.object(forInfoDictionaryKey: "RemoteFixtureKind") as? String == "notes" ? "notes" : "counter"
            func route(_ id: String, _ method: String, _ path: String, _ capability: String, _ wire: String = "http", _ maxBytes: Int = 1_048_576) throws -> RemoteNativeConfiguration.Route { try .init(id: id, method: method, path: path, kind: wire, capabilities: [capability], maxRequestBytes: maxBytes) }
            let routes = try kind == "notes" ? [route("notes.list", "GET", "/api/notes", "notes:read"), route("notes.create", "POST", "/api/notes", "notes:write", "http", 8192), route("notes.remove", "DELETE", "/api/notes/:id", "notes:write")] : [route("counter.read", "GET", "/api/counter", "counter:read"), route("counter.write", "POST", "/api/counter", "counter:write", "http", 8192), route("counter.events", "GET", "/api/events", "counter:read", "sse"), route("counter.socket", "GET", "/api/socket", "counter:read", "websocket"), route("counter.media", "GET", "/api/media", "counter:read"), route("counter.upload", "POST", "/api/upload", "counter:write", "http", 4_194_304)]
            let configuration = try RemoteNativeConfiguration(appId: "remote.fixture." + kind, assetsDirectory: Bundle.main.bundleURL.appendingPathComponent("public"), routes: routes)
            let window = UIWindow(frame: UIScreen.main.bounds); self.window = window
            _remote = try RemoteNativeHost(configuration: configuration) { _ in window.rootViewController = RemoteBridgeViewController(); window.makeKeyAndVisible() }
            window.rootViewController = RemoteBridgeViewController(); window.makeKeyAndVisible(); return true
        } catch { return false }
    }
}
