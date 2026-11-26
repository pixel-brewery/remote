// #region Imports
import Capacitor
// #endregion

/// Recreates the trusted Capacitor origin before a selected protected local view loads.
@MainActor open class RemoteBridgeViewController: CAPBridgeViewController {
    override open func instanceDescriptor() -> InstanceDescriptor { let descriptor = super.instanceDescriptor(); if let origin = RemoteNativeHost.installed?.localOrigin { descriptor.serverURL = origin.absoluteString }; descriptor.allowedNavigationHostnames = []; return descriptor }
    override open func capacitorDidLoad() { bridge?.registerPluginInstance(RemotePlugin()) }
}
