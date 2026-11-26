package de.pixelbrewery.remote.bridge

// #region Imports
import android.webkit.CookieManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import java.net.URI
import kotlin.coroutines.resume
// #endregion

/**
 * Bounded persistent loopback capability cookie of the active native view.
 *
 * Capacitor's built-in CapacitorCookies plugin calls CookieManager.removeSessionCookies() whenever a
 * bridge loads or is destroyed, so a session cookie would vanish when the Activity recreates its
 * bridge for the gateway origin. The capability is therefore persistent with a bounded Max-Age,
 * refreshed while its activation stays active and explicitly expired when the connection closes,
 * is forgotten, is replaced or the runtime is disposed. Every write is flushed before the caller
 * recreates the bridge.
 */
internal object RemoteLocalCookie {
    /** Fixed cookie name admitted by the native loopback gateway. */
    internal const val NAME: String = "remote_local"
    /** Upper bound in seconds after the last install or refresh; covers a process that dies without closing. */
    internal const val MAX_AGE_SECONDS: Long = 43_200

    /** Set-Cookie value installing one 64-hex-character capability for the gateway origin root. */
    internal fun header(capability: String): String {
        require(capability.matches(Regex("[a-f0-9]{64}"))) { "Invalid local view capability." }
        return "$NAME=$capability; Path=/; Max-Age=$MAX_AGE_SECONDS; HttpOnly; SameSite=Strict"
    }

    /** Set-Cookie value removing the capability immediately, including WebView versions that ignore Max-Age=0. */
    internal fun expiredHeader(): String = "$NAME=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict"

    /** True only for an exact `http://127.0.0.1:<port>` origin without user information, path, query or fragment. */
    internal fun isLoopbackOrigin(origin: String): Boolean = runCatching { URI(origin) }.getOrNull()?.let {
        it.scheme == "http" && it.host == "127.0.0.1" && it.rawUserInfo == null && it.port in 1..65535 && it.rawPath.isNullOrEmpty() && it.rawQuery == null && it.rawFragment == null
    } == true

    /** Install or refresh the capability on the main thread and flush it to persistent storage before returning. */
    internal suspend fun install(origin: String, capability: String) {
        require(isLoopbackOrigin(origin)) { "The local view must be an exact loopback origin." }
        val header = header(capability)
        check(write(origin, header)) { "The WebView rejected the local view capability." }
    }

    /** Remove the capability of a closed gateway origin and flush the removal; removal is best effort. */
    internal suspend fun expire(origin: String) {
        if (isLoopbackOrigin(origin)) write(origin, expiredHeader())
    }

    private suspend fun write(origin: String, value: String): Boolean = withContext(Dispatchers.Main) {
        val manager = CookieManager.getInstance()
        val written = suspendCancellableCoroutine { continuation -> manager.setCookie(origin, value) { accepted -> if (continuation.isActive) continuation.resume(accepted) } }
        manager.flush()
        written
    }
}
