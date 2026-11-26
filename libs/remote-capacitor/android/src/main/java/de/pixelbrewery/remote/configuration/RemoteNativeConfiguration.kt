package de.pixelbrewery.remote.configuration

// #region Imports
import de.pixelbrewery.remote.transport.RemoteNativeRuntime
import de.pixelbrewery.remote.transport.RemoteRouteMatcher
import android.content.Context
import java.io.File
// #endregion

/** Application-owned immutable route, identity and packaged-content policy. */
public class RemoteNativeConfiguration(
    public val appId: String,
    public val assetsDirectory: File,
    public val storageDirectory: File,
    routes: List<Route>,
    contentPolicy: Map<String, Boolean> = emptyMap(),
) {
    /** Immutable app-owned HTTPS resource permissions; validated against the generated canonical schema before networking. */
    public val contentPolicy: Map<String, Boolean> = java.util.Collections.unmodifiableMap(contentPolicy.toMap())
    /** Exact method/path admission; request quota defaults to 1 MiB and is configurable up to 64 MiB without buffering that quota. */
    public data class Route(
        val id: String,
        val method: String,
        val path: String,
        val kind: String,
        val capabilities: Set<String>,
        val maxRequestBytes: Long = 1_048_576,
    )
    public val routes: List<Route> = routes.toList()
    init {
        require(appId.matches(Regex("[a-z][a-z0-9.-]{0,79}")))
        require(assetsDirectory.isDirectory && storageDirectory.isAbsolute)
        require(routes.map { route -> route.method + " " + route.path.split('/').joinToString("/") { if (it.startsWith(':')) ":parameter" else it } }.distinct().size == routes.size)
        routes.forEach { require(it.method in setOf("GET", "HEAD", "POST", "PUT", "PATCH", "DELETE")); RemoteRouteMatcher.validateTemplate(it.path); require(it.kind in setOf("http", "sse", "websocket") && it.maxRequestBytes in 0..67_108_864) }
    }
    public companion object {
        @Volatile private var _configuration: RemoteNativeConfiguration? = null
        @Volatile internal var activeOrigin: String? = null
        @Volatile internal var activeConnectionId: String? = null
        private var _runtime: RemoteNativeRuntime? = null
        /** Configure once from Application.onCreate, before any WebView exists. */
        @JvmStatic public fun install(configuration: RemoteNativeConfiguration) { synchronized(this) { check(_configuration == null); _configuration = configuration } }
        internal fun requireInstalled(): RemoteNativeConfiguration = checkNotNull(_configuration) { "Install the application-owned Remote configuration before creating its bridge." }
        @Synchronized internal fun runtime(context: Context): RemoteNativeRuntime = _runtime ?: RemoteNativeRuntime(context.applicationContext, requireInstalled()).also { _runtime = it }
        /** Close all owned streams when the native application owner explicitly exits the remote capability. */
        @JvmStatic public suspend fun dispose() { val runtime = synchronized(this) { _runtime.also { _runtime = null; activeOrigin = null; activeConnectionId = null } }; runtime?.dispose() }
        /** Copy the application's packaged public assets into a private immutable content directory. */
        @JvmStatic public fun copyPackagedAssets(context: Context, source: String, destination: File) {
            require(source.isNotEmpty() && !source.contains(".."))
            destination.mkdirs()
            fun copy(path: String, target: File) {
                val entries = context.assets.list(path).orEmpty()
                if (entries.isEmpty()) context.assets.open(path).use { input -> target.outputStream().use(input::copyTo) }
                else { target.mkdirs(); entries.forEach { require(it != "." && it != ".."); copy("$path/$it", File(target, it)) } }
            }
            copy(source, destination)
        }
    }
}
