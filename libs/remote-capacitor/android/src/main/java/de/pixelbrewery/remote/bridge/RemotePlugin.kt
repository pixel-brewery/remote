package de.pixelbrewery.remote.bridge

// #region Imports
import de.pixelbrewery.remote.configuration.RemoteNativeConfiguration
import de.pixelbrewery.remote.bridge.interfaces.IRemoteViewOwner
import de.pixelbrewery.remote.transport.RemoteNativeRuntime
import de.pixelbrewery.remote.protocol.RemoteProtocolContract
import de.pixelbrewery.remote.pairing.RemoteQrActivity
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.webkit.CookieManager
import android.webkit.WebSettings
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume
// #endregion

/** Fixed validated control surface; no URL fetch, route registration or credential API enters JS. */
@CapacitorPlugin(name = "PixelBreweryRemote")
public class RemotePlugin : Plugin() {
    private val _scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var _runtime: RemoteNativeRuntime
    private lateinit var _contract: RemoteProtocolContract
    private var _packagedOrigin = ""
    @Volatile private var _localOrigin: String? = null

    public override fun load() {
        _runtime = RemoteNativeConfiguration.runtime(context.applicationContext)
        _contract = RemoteProtocolContract(context.applicationContext)
        _packagedOrigin = bridge.localUrl.removeSuffix("/")
        _localOrigin = RemoteNativeConfiguration.activeOrigin
        bridge.webView.settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        bridge.webView.settings.allowFileAccess = false
        bridge.webView.settings.allowContentAccess = false
        CookieManager.getInstance().setAcceptThirdPartyCookies(bridge.webView, false)
    }
    /** Execute a canonical native request from packaged content only. */
    @PluginMethod public fun invoke(call: PluginCall) {
        val request = call.getObject("request") ?: run { call.reject("Missing request.", "invalid-request"); return }
        _scope.launch {
            if (!withContext(Dispatchers.Main) { trustedCurrentDocument() }) { call.reject("Remote control requires the application's packaged view.", "forbidden"); return@launch }
            runCatching { _runtime.invoke(request) { activation ->
                withContext(Dispatchers.Main) {
                    val origin = activation.view.getString("origin")
                    suspendCancellableCoroutine { continuation -> CookieManager.getInstance().setCookie(origin, "remote_local=${activation.cookie}; Path=/; HttpOnly; SameSite=Strict") { installed -> if (continuation.isActive) continuation.resume(installed) } }.also { check(it) }
                    CookieManager.getInstance().flush()
                    _localOrigin = origin
                    RemoteNativeConfiguration.activeOrigin = origin
                    RemoteNativeConfiguration.activeConnectionId = activation.view.getString("connectionId")
                    // The owning Activity must recreate its bridge with the descriptor's loopback origin.
                    // Main-frame navigation alone does not reconfigure Capacitor's trusted bridge origin.
                    (activity as? IRemoteViewOwner ?: error("The Activity must implement IRemoteViewOwner.")).openRemoteView(origin)
                }
            }.also {
                if (request.optString("kind") in setOf("connections.close", "connections.forget") && request.optString("connectionId") == RemoteNativeConfiguration.activeConnectionId) withContext(Dispatchers.Main) {
                    RemoteNativeConfiguration.activeOrigin = null; RemoteNativeConfiguration.activeConnectionId = null; _localOrigin = null
                    (activity as? IRemoteViewOwner ?: error("The Activity must implement IRemoteViewOwner.")).openRemoteView(null)
                }
            } }.fold({ response -> call.resolve(JSObject().put("response", JSObject(response.toString()))) }, { call.reject(it.message ?: "Remote operation failed.", "network") })
        }
    }
    /** Scan an invitation with the bundled on-device ML Kit model. */
    @PluginMethod public fun scanPairing(call: PluginCall) {
        activity.runOnUiThread {
            if (!trustedCurrentDocument()) { call.reject("Untrusted document.", "forbidden"); return@runOnUiThread }
            startActivityForResult(call, Intent(context, RemoteQrActivity::class.java), "scanned")
        }
    }
    @ActivityCallback private fun scanned(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        if (result.resultCode != Activity.RESULT_OK) { call.reject("QR scanning was cancelled.", "cancelled"); return }
        runCatching { _contract.invitation(result.data?.getStringExtra("invitation") ?: error("No invitation found.")) }
            .fold({ call.resolve(JSObject().put("bootstrap", JSObject(it.toString()))) }, { call.reject("The QR code is not a Remote invitation.", "invalid-request") })
    }
    public override fun shouldOverrideLoad(url: Uri): Boolean? = !trustedOrigin(url)
    public override fun handleOnDestroy() { _scope.cancel() }
    private fun trustedCurrentDocument(): Boolean = bridge.webView.url?.let { trustedOrigin(Uri.parse(it)) } == true
    private fun trustedOrigin(uri: Uri): Boolean { val origin = "${uri.scheme}://${uri.encodedAuthority}"; return uri.userInfo == null && (origin == _packagedOrigin || origin == _localOrigin) }
}
