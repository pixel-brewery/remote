package de.pixelbrewery.remote.protocol

// #region Imports
import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.net.URI
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
// #endregion

/** Evaluates the JSON-Schema subset emitted from the canonical Zod protocol; unknown assertions fail closed. */
internal class RemoteProtocolContract(private val _bundle: JSONObject) {
    constructor(context: Context) : this(JSONObject(context.assets.open("remote-protocol-v1.json").bufferedReader().use { it.readText() }))
    val routes: JSONObject = _bundle.getJSONObject("routes")
    init { require(_bundle.getInt("protocolVersion") == 1) }
    fun validate(name: String, value: Any): JSONObject { semantics(value); checkSchema(_bundle.getJSONObject("schemas").getJSONObject(name), value); return value as JSONObject }
    fun invitation(raw: String): JSONObject {
        require(raw.length <= 8192)
        val uri = URI(raw)
        val fields = uri.rawFragment.orEmpty().split('&').map { it.split('=', limit = 2) }.groupBy { java.net.URLDecoder.decode(it[0], "UTF-8") }
        fun field(name: String): String { val values = fields[name]; require(values?.size == 1 && values[0].size == 2); return java.net.URLDecoder.decode(values[0][1], "UTF-8") }
        val origin = "${uri.scheme}://${uri.rawAuthority}"
        return validate("remotePairingBootstrap", JSONObject().put("appId", field("app")).put("hostId", field("host")).put("origin", origin).put("challenge", field("pair")).put("expiresAt", field("expires")))
    }
    private fun semantics(value: Any?) {
        if (value is JSONArray) { (0 until value.length()).forEach { semantics(value.get(it)) }; return }
        if (value !is JSONObject) return
        listOf("deviceName", "label", "name").forEach { key -> if (value.opt(key) is String) value.put(key, value.getString(key).trim { it.isWhitespace() || it == '\uFEFF' || it == '\u00A0' }) }
        if (value.has("origin")) { val uri = URI(value.getString("origin")); require(uri.scheme in setOf("http", "https") && !uri.host.isNullOrEmpty() && uri.rawUserInfo == null && uri.rawPath.orEmpty() in setOf("", "/") && uri.rawQuery == null && uri.rawFragment == null) }
        if (value.has("host") && value.has("principal")) { val identity = value.getJSONObject("host").getJSONObject("identity"); val principal = value.getJSONObject("principal"); require(identity.getString("appId") == principal.getString("appId") && identity.getString("hostId") == principal.getString("hostId")) }
        if (value.has("selectedEndpointId")) { val endpoints = value.getJSONArray("endpoints"); require((0 until endpoints.length()).any { endpoints.getJSONObject(it).getString("id") == value.getString("selectedEndpointId") }) }
        value.keys().forEach { semantics(value.get(it)) }
    }
    private fun checkSchema(schema: JSONObject, value: Any?) {
        if (schema.has("$" + "ref")) throw IllegalArgumentException("Unresolved canonical schema reference")
        schema.optJSONArray("anyOf")?.let { choices -> require((0 until choices.length()).any { runCatching { checkSchema(choices.getJSONObject(it), value) }.isSuccess }); return }
        schema.optJSONArray("oneOf")?.let { choices -> require((0 until choices.length()).count { runCatching { checkSchema(choices.getJSONObject(it), value) }.isSuccess } == 1); return }
        if (schema.has("const")) { val expected = schema.get("const"); require(if (expected is Number && value is Number) expected.toDouble() == value.toDouble() else expected == value) }
        schema.optJSONArray("enum")?.let { require((0 until it.length()).any { index -> it.get(index) == value }) }
        when (schema.optString("type")) {
            "object" -> { require(value is JSONObject); val properties = schema.optJSONObject("properties") ?: JSONObject(); schema.optJSONArray("required")?.let { required -> (0 until required.length()).forEach { require(value.has(required.getString(it))) } }; value.keys().forEach { key -> if (properties.has(key)) checkSchema(properties.getJSONObject(key), value.get(key)) else require(schema.opt("additionalProperties") != false) } }
            "array" -> { require(value is JSONArray); require(value.length() >= schema.optInt("minItems", 0) && value.length() <= schema.optInt("maxItems", Int.MAX_VALUE)); schema.optJSONObject("items")?.let { item -> (0 until value.length()).forEach { checkSchema(item, value.get(it)) } } }
            "string" -> { require(value is String); require(value.length >= schema.optInt("minLength", 0) && value.length <= schema.optInt("maxLength", Int.MAX_VALUE)); if (schema.has("pattern")) require(Regex(schema.getString("pattern")).containsMatchIn(value)); when (schema.optString("format")) { "uri", "url" -> require(URI(value).isAbsolute); "date-time" -> { timestamp(value); Unit }; "" -> {}; else -> throw IllegalArgumentException("Unsupported canonical string format") } }
            "integer" -> require(value is Number && value.toDouble() == value.toLong().toDouble())
            "number" -> require(value is Number)
            "boolean" -> require(value is Boolean)
            "null" -> require(value == null || value == JSONObject.NULL)
            "" -> {}
            else -> throw IllegalArgumentException("Unsupported canonical schema type")
        }
        if (value is Number) { if (schema.has("minimum")) require(value.toDouble() >= schema.getDouble("minimum")); if (schema.has("maximum")) require(value.toDouble() <= schema.getDouble("maximum")) }
    }
    companion object {
        fun timestamp(value: String): Long {
            val normalized = Regex("\\.([0-9]+)Z$").replace(value) { "." + it.groupValues[1].padEnd(3, '0').take(3) + "Z" }
            for (pattern in listOf("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", "yyyy-MM-dd'T'HH:mm:ss'Z'")) {
                val format = SimpleDateFormat(pattern, Locale.ROOT); format.timeZone = TimeZone.getTimeZone("UTC"); format.isLenient = false
                val position = java.text.ParsePosition(0); val parsed = format.parse(normalized, position)
                if (parsed != null && position.index == normalized.length) return parsed.time
            }
            throw IllegalArgumentException("Invalid timestamp")
        }
    }
}
