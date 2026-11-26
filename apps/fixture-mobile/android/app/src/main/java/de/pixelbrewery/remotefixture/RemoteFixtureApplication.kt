package de.pixelbrewery.remotefixture

// #region Imports
import android.app.Application
import de.pixelbrewery.remote.configuration.RemoteNativeConfiguration
import java.io.File
// #endregion

/** Two product flavors share one packaged UI and SDK while keeping distinct app/credential namespaces. */
public class RemoteFixtureApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        val assets = File(filesDir, "remote-public")
        RemoteNativeConfiguration.copyPackagedAssets(this, "public", assets)
        val kind = BuildConfig.REMOTE_KIND
        fun route(id: String, method: String, path: String, capability: String, wire: String = "http", maxBytes: Long = 1_048_576) = RemoteNativeConfiguration.Route(id, method, path, wire, setOf(capability), maxBytes)
        val routes = if (kind == "notes") listOf(route("notes.list", "GET", "/api/notes", "notes:read"), route("notes.create", "POST", "/api/notes", "notes:write", maxBytes = 8192), route("notes.remove", "DELETE", "/api/notes/:id", "notes:write"))
        else listOf(route("counter.read", "GET", "/api/counter", "counter:read"), route("counter.write", "POST", "/api/counter", "counter:write", maxBytes = 8192), route("counter.events", "GET", "/api/events", "counter:read", "sse"), route("counter.socket", "GET", "/api/socket", "counter:read", "websocket"), route("counter.media", "GET", "/api/media", "counter:read"), route("counter.upload", "POST", "/api/upload", "counter:write", maxBytes = 4_194_304))
        RemoteNativeConfiguration.install(RemoteNativeConfiguration("remote.fixture.$kind", assets, File(noBackupFilesDir, "remote"), routes))
    }
}
