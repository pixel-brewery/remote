package de.pixelbrewery.remote.transport

// #region Imports
import de.pixelbrewery.remote.configuration.RemoteNativeConfiguration
import de.pixelbrewery.remote.transport.RemotePeerPolicy
import de.pixelbrewery.remote.transport.RemoteRouteMatcher
import de.pixelbrewery.remote.protocol.RemoteProtocolContract
import de.pixelbrewery.remote.credentials.RemoteSecureStore
import android.content.Context
import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO as ClientCIO
import io.ktor.client.engine.cio.endpoint
import io.ktor.client.plugins.websocket.WebSockets as ClientWebSockets
import io.ktor.client.plugins.websocket.webSocket
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.header
import io.ktor.client.request.prepareRequest
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsChannel
import io.ktor.client.statement.HttpResponse
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.OutgoingContent
import io.ktor.server.application.ApplicationCall
import io.ktor.server.application.install
import io.ktor.server.cio.CIO as ServerCIO
import io.ktor.server.engine.embeddedServer
import io.ktor.server.request.httpMethod
import io.ktor.server.request.receiveChannel
import io.ktor.server.request.uri
import io.ktor.server.response.respondBytesWriter
import io.ktor.server.response.respondText
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import io.ktor.server.websocket.WebSockets as ServerWebSockets
import io.ktor.server.websocket.webSocket
import io.ktor.utils.io.ByteReadChannel
import io.ktor.utils.io.ByteWriteChannel
import io.ktor.utils.io.readAvailable
import io.ktor.utils.io.writeFully
import io.ktor.websocket.Frame
import io.ktor.websocket.close
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.UUID
// #endregion

/** Owns native networking and an authenticated packaged-content gateway, outside the WebView. */
internal class RemoteNativeRuntime(context: Context, private val _configuration: RemoteNativeConfiguration) {
    private val _contract = RemoteProtocolContract(context)
    private val _contentPolicy = _contract.validate("remoteContentPolicy", JSONObject(_configuration.contentPolicy))
    private val _store = RemoteSecureStore(_configuration.storageDirectory, _configuration.appId)
    private val _mutex = Mutex()
    private val _client = HttpClient(ClientCIO) { followRedirects = false; expectSuccess = false; install(ClientWebSockets) { maxFrameSize = 65_536 }; engine { requestTimeout = 0; maxConnectionsCount = 32; endpoint { connectTimeout = 5_000; socketTimeout = 0 } } }
    private val _attempts = linkedMapOf<String, Pair<String, Long>>()
    private var _active: Active? = null
    private var _disposed = false
    internal data class Activation(val view: JSONObject, val cookie: String)
    private class Active(val id: String, val origin: String, val cookie: String, val scope: CoroutineScope, val close: suspend () -> Unit)

    suspend fun invoke(request: JSONObject, activate: suspend (Activation) -> Unit): JSONObject = _mutex.withLock {
        check(!_disposed)
        _contract.validate("remoteNativeRequest", request)
        val response = when (request.getString("kind")) {
            "connections.list" -> JSONObject().put("kind", "connections").put("connections", profiles())
            "connections.close" -> { if (_active?.id == request.getString("connectionId")) closeActive(); JSONObject().put("kind", "done") }
            "connections.forget" -> { val id = request.getString("connectionId"); if (_active?.id == id) closeActive(); val records = _store.read(); records.remove(id); _store.write(records); JSONObject().put("kind", "done") }
            "connections.open" -> {
                val id = request.getString("connectionId"); val record = _store.read().optJSONObject(id) ?: error("The saved connection does not exist.")
                val profile = _contract.validate("remoteSavedConnection", record.getJSONObject("profile")); checkIdentity(profile.getJSONObject("identity"))
                val endpoint = profile.getJSONArray("endpoints").let { array -> (0 until array.length()).map { array.getJSONObject(it) }.single { it.getString("id") == profile.getString("selectedEndpointId") } }
                val origin = endpoint.getString("origin"); RemotePeerPolicy.origin(origin)
                val host = protocol(origin, "GET", _contract.routes.getString("host"), null, null, "remoteHostDescriptor")
                checkIdentity(host.getJSONObject("identity"), profile.getJSONObject("identity").getString("hostId"))
                val credential = record.getString("credential")
                val session = protocol(origin, "GET", _contract.routes.getString("session"), null, credential, "remoteSessionDescriptor"); checkSession(session, host)
                val activation = open(id, origin, credential, profile.getJSONObject("identity"), session); activate(activation)
                JSONObject().put("kind", "view").put("view", activation.view)
            }
            "pairings.complete" -> {
                val invitation = _contract.validate("remotePairingBootstrap", request.getJSONObject("bootstrap")); checkIdentity(invitation)
                val origin = invitation.getString("origin"); RemotePeerPolicy.origin(origin)
                val expires = RemoteProtocolContract.timestamp(invitation.getString("expiresAt")); require(expires > System.currentTimeMillis())
                val host = protocol(origin, "GET", _contract.routes.getString("host"), null, null, "remoteHostDescriptor"); checkIdentity(host.getJSONObject("identity"), invitation.getString("hostId"))
                _attempts.entries.removeAll { it.value.second <= System.currentTimeMillis() }
                val challenge = invitation.getString("challenge"); require(_attempts.containsKey(challenge) || _attempts.size < 16)
                val attempt = _attempts.getOrPut(challenge) { UUID.randomUUID().toString() to expires }
                val pairing = JSONObject().put("challenge", challenge).put("deviceName", request.getString("deviceName")).put("attemptId", attempt.first).put("credentialMode", "bearer")
                _contract.validate("remotePairingRequest", pairing)
                val paired = protocol(origin, "POST", _contract.routes.getString("pairings"), pairing, null, "remotePairingResponse")
                check(paired.getString("status") == "paired") { "Host approval is pending; retry the same invitation after approval." }
                val session = paired.getJSONObject("session"); checkSession(session, host)
                val credential = paired.getString("credential"); require(credential.length in 32..256)
                val endpoints = host.getJSONArray("endpoints"); val endpoint = (0 until endpoints.length()).map { endpoints.getJSONObject(it) }.single { it.getString("origin") == origin }
                val id = MessageDigest.getInstance("SHA-256").digest("${_configuration.appId}\u0000${invitation.getString("hostId")}".toByteArray()).joinToString("") { "%02x".format(it) }
                val profile = _contract.validate("remoteSavedConnection", JSONObject().put("id", id).put("identity", host.getJSONObject("identity")).put("label", host.getString("name")).put("endpoints", endpoints).put("selectedEndpointId", endpoint.getString("id")))
                val records = _store.read(); require(records.has(id) || records.length() < 64); records.put(id, JSONObject().put("profile", profile).put("credential", credential)); _store.write(records)
                _attempts.remove(challenge)
                val activation = open(id, origin, credential, host.getJSONObject("identity"), session); activate(activation)
                JSONObject().put("kind", "view").put("view", activation.view)
            }
            else -> error("Unsupported remote control operation.")
        }
        _contract.validate("remoteNativeResponse", response)
    }

    suspend fun dispose() = _mutex.withLock { if (!_disposed) { _disposed = true; closeActive(); _client.close(); _attempts.clear() } }

    private fun profiles(): JSONArray {
        val records = _store.read(); val result = JSONArray()
        records.keys().forEach { id -> val profile = _contract.validate("remoteSavedConnection", records.getJSONObject(id).getJSONObject("profile")); checkIdentity(profile.getJSONObject("identity")); result.put(profile) }
        return result
    }
    private fun checkIdentity(identity: JSONObject, hostId: String? = null) { require(identity.getString("appId") == _configuration.appId && (hostId == null || identity.getString("hostId") == hostId)) }
    private fun checkSession(session: JSONObject, host: JSONObject) {
        val identity = host.getJSONObject("identity"); checkIdentity(session.getJSONObject("host").getJSONObject("identity"), identity.getString("hostId")); checkIdentity(session.getJSONObject("principal"), identity.getString("hostId"))
    }
    private suspend fun protocol(origin: String, method: String, path: String, body: JSONObject?, credential: String?, schema: String): JSONObject {
        RemotePeerPolicy.origin(origin); RemotePeerPolicy.path(path)
        return withTimeout(15_000) { _client.prepareRequest(origin + path) {
            this.method = HttpMethod.parse(method); header(HttpHeaders.Accept, "application/json")
            if (credential != null) header(HttpHeaders.Authorization, "Bearer $credential")
            if (body != null) { header(HttpHeaders.ContentType, "application/json"); setBody(body.toString()) }
        }.execute { response ->
            require(response.status.value in 200..299) { if (response.status.value == 401) "The device must be paired again." else "Remote protocol request failed (${response.status.value})." }
            val bytes = boundedRead(response.bodyAsChannel(), 65_536)
            _contract.validate(schema, JSONObject(String(bytes, Charsets.UTF_8)))
        } }
    }
    private suspend fun open(id: String, remoteOrigin: String, credential: String, identity: JSONObject, session: JSONObject): Activation {
        closeActive()
        val cookie = ByteArray(32).also { SecureRandom().nextBytes(it) }.joinToString("") { "%02x".format(it) }
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
        val granted = session.getJSONObject("principal").getJSONArray("capabilities").let { array -> (0 until array.length()).map { array.getString(it) }.toSet() }
        var localOrigin = ""
        val server = embeddedServer(ServerCIO, host = "127.0.0.1", port = 0) {
            install(ServerWebSockets) { maxFrameSize = 65_536 }
            routing {
                _configuration.routes.filter { it.kind == "websocket" }.forEach { route ->
                    webSocket(route.path.split('/').joinToString("/") { if (it.startsWith(':')) "{" + it.drop(1) + "}" else it }) {
                        if (!authorized(call, cookie, localOrigin) || RemoteRouteMatcher.match(_configuration.routes, call.request.httpMethod.value, call.request.uri)?.id != route.id || !granted.containsAll(route.capabilities)) { close(); return@webSocket }
                        val local = this
                        val job = scope.launch {
                            _client.webSocket(urlString = remoteOrigin.replaceFirst("http", "ws") + call.request.uri, request = { header(HttpHeaders.Authorization, "Bearer $credential") }) {
                                val remote = this
                                coroutineScope {
                                    val upstream = launch { try { for (frame in local.incoming) { require(frame.data.size <= 65_536); remote.send(frame) } } finally { remote.close() } }
                                    try { for (frame in remote.incoming) { require(frame.data.size <= 65_536); local.send(frame) } } finally { upstream.cancel(); local.close() }
                                }
                            }
                        }
                        try { job.join() } finally { job.cancel() }
                    }
                }
                route("/{path...}") {
                    handle {
                        if (!authorized(call, cookie, localOrigin)) { call.respondText("Unauthorized", status = HttpStatusCode.Unauthorized); return@handle }
                        val path = runCatching { RemotePeerPolicy.path(call.request.uri) }.getOrNull()
                        if (path == null) { call.respondText("Invalid path", status = HttpStatusCode.BadRequest); return@handle }
                        val protocolRoute = if ((path == _contract.routes.getString("host") && call.request.httpMethod.value == "GET") || (path == _contract.routes.getString("session") && call.request.httpMethod.value in setOf("GET", "DELETE"))) RemoteNativeConfiguration.Route("sdk-control", call.request.httpMethod.value, path, "http", emptySet(), 0) else null
                        val route = protocolRoute ?: RemoteRouteMatcher.match(_configuration.routes.filter { it.kind != "websocket" }, call.request.httpMethod.value, call.request.uri)
                        if (route != null) {
                            if (!granted.containsAll(route.capabilities)) { call.respondText("Forbidden", status = HttpStatusCode.Forbidden); return@handle }
                            val job = scope.launch { proxy(call, remoteOrigin, credential, route) }
                            try { job.join() } finally { job.cancel() }
                        } else if (call.request.httpMethod.value in setOf("GET", "HEAD") && !path.startsWith("/__remote/")) {
                            val root = _configuration.assetsDirectory.canonicalFile
                            val file = File(root, if (path == "/") "index.html" else path.removePrefix("/")).canonicalFile
                            if (!file.path.startsWith(root.path + File.separator) || !file.isFile) { call.respondText("Not found", status = HttpStatusCode.NotFound); return@handle }
                            call.response.headers.append("content-security-policy", RemoteContentSecurityPolicy.packaged(_configuration.contentPolicy))
                            call.response.headers.append("x-content-type-options", "nosniff")
                            val mime = when (file.extension) { "html" -> "text/html"; "js", "mjs" -> "text/javascript"; "css" -> "text/css"; "json" -> "application/json"; "svg" -> "image/svg+xml"; "png" -> "image/png"; "woff2" -> "font/woff2"; else -> "application/octet-stream" }
                            call.respondBytesWriter(ContentType.parse(mime)) { if (call.request.httpMethod.value != "HEAD") file.inputStream().use { input -> val bytes = ByteArray(32_768); while (true) { val count = input.read(bytes); if (count < 0) break; writeFully(bytes, 0, count); flush() } } }
                        } else call.respondText("Not found", status = HttpStatusCode.NotFound)
                    }
                }
            }
        }.start(wait = false)
        val port = server.engine.resolvedConnectors().single().port
        localOrigin = "http://127.0.0.1:$port"
        _active = Active(id, localOrigin, cookie, scope) { server.stop(0, 1_000) }
        val view = _contract.validate("remoteLocalView", JSONObject().put("connectionId", id).put("identity", identity).put("origin", localOrigin))
        return Activation(view, cookie)
    }
    private fun authorized(call: ApplicationCall, cookie: String, localOrigin: String): Boolean {
        if (call.request.headers[HttpHeaders.Host] != localOrigin.removePrefix("http://")) return false
        val origin = call.request.headers[HttpHeaders.Origin]
        if (origin != null && origin != localOrigin) return false
        if (call.request.headers["Sec-Fetch-Site"] in setOf("cross-site", "same-site")) return false
        val actual = call.request.headers[HttpHeaders.Cookie].orEmpty().split(';').map { it.trim().split('=', limit = 2) }.singleOrNull { it.size == 2 && it[0] == "remote_local" }?.get(1) ?: return false
        return MessageDigest.isEqual(actual.toByteArray(), cookie.toByteArray())
    }
    private suspend fun proxy(call: ApplicationCall, origin: String, credential: String, route: RemoteNativeConfiguration.Route) {
        if (call.request.headers["Sec-Fetch-Dest"]?.lowercase() in setOf("script", "style", "worker", "sharedworker", "serviceworker", "document", "iframe", "frame", "object", "embed")) { call.respondText("Remote executable content is unavailable in the native view", status = HttpStatusCode.Forbidden); return }
        RemotePeerPolicy.origin(origin)
        val length = call.request.headers[HttpHeaders.ContentLength]?.toLongOrNull()
        if (length != null && length > route.maxRequestBytes) { call.respondText("Request too large", status = HttpStatusCode.PayloadTooLarge); return }
        _client.prepareRequest(origin + call.request.uri) {
            method = HttpMethod.parse(route.method); header(HttpHeaders.Authorization, "Bearer $credential")
            for (name in listOf("Accept", "Content-Type", "Range", "If-Range", "If-None-Match", "Last-Event-ID")) call.request.headers[name]?.let { header(name, it) }
            if (route.method !in setOf("GET", "HEAD")) setBody(object : OutgoingContent.WriteChannelContent() {
                override suspend fun writeTo(channel: ByteWriteChannel) { copy(call.receiveChannel(), channel, route.maxRequestBytes) }
            })
        }.execute { response ->
            if (response.status.value in 300..399) { call.respondText("Remote redirects are disabled", status = HttpStatusCode.BadGateway); return@execute }
            if (response.status.value == 401) { call.respondText("Unauthorized", status = HttpStatusCode.Unauthorized); _active?.scope?.cancel(); return@execute }
            val mediaType = response.headers[HttpHeaders.ContentType]?.substringBefore(';')?.trim()?.lowercase().orEmpty()
            if (Regex("javascript|ecmascript|html|svg\\+xml").containsMatchIn(mediaType)) { call.respondText("Remote executable content is unavailable in the native view", status = HttpStatusCode.Forbidden); return@execute }
            call.response.headers.append("content-security-policy", "sandbox; default-src 'none'; frame-ancestors 'none'")
            for (name in listOf("Content-Type", "Content-Range", "Accept-Ranges", "ETag", "Cache-Control", "Last-Modified")) response.headers[name]?.let { call.response.headers.append(name, it) }
            call.response.headers.append("x-content-type-options", "nosniff")
            call.respondBytesWriter(status = response.status) { if (route.method != "HEAD") copy(response.bodyAsChannel(), this, Long.MAX_VALUE) }
            if (route.id == "sdk-control" && route.method == "DELETE" && response.status.value in 200..299) _active?.scope?.cancel()
        }
    }
    private suspend fun closeActive() { val current = _active; _active = null; current?.scope?.cancel(); current?.close?.invoke() }
    private suspend fun boundedRead(source: ByteReadChannel, limit: Int): ByteArray { val output = java.io.ByteArrayOutputStream(); val bytes = ByteArray(8192); while (true) { val count = source.readAvailable(bytes); if (count < 0) break; require(output.size() + count <= limit); output.write(bytes, 0, count) }; return output.toByteArray() }
    private suspend fun copy(source: ByteReadChannel, target: ByteWriteChannel, limit: Long) { val bytes = ByteArray(32_768); var total = 0L; while (true) { val count = source.readAvailable(bytes); if (count < 0) break; total += count; require(total <= limit); target.writeFully(bytes, 0, count); target.flush() } }
}
