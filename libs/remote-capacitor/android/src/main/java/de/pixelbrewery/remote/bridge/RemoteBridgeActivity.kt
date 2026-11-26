package de.pixelbrewery.remote.bridge

// #region Imports
import de.pixelbrewery.remote.configuration.RemoteNativeConfiguration
import de.pixelbrewery.remote.bridge.RemotePlugin
import de.pixelbrewery.remote.bridge.interfaces.IRemoteViewOwner
import com.getcapacitor.BridgeActivity
import com.getcapacitor.CapConfig
// #endregion

/** Application activity base which configures trust before Capacitor constructs its bridge. */
public open class RemoteBridgeActivity : BridgeActivity(), IRemoteViewOwner {
    public override fun load() {
        registerPlugin(RemotePlugin::class.java)
        val builder = CapConfig.Builder(this).setAllowNavigation(emptyArray()).setAllowMixedContent(false).setLoggingEnabled(false)
        RemoteNativeConfiguration.activeOrigin?.let { builder.setServerUrl(it) }
        config = builder.create()
        super.load()
    }
    public override fun openRemoteView(origin: String?) {
        require(origin == null || java.net.URI(origin).let { it.scheme == "http" && it.host == "127.0.0.1" && it.port in 1..65535 && it.rawPath.isNullOrEmpty() && it.rawQuery == null && it.rawFragment == null })
        RemoteNativeConfiguration.activeOrigin = origin
        recreate()
    }
}
