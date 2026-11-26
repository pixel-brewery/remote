package de.pixelbrewery.remote.transport

/** Extends only the selected HTTPS resource directives of trusted packaged assets. */
internal object RemoteContentSecurityPolicy {
    fun packaged(policy: Map<String, Boolean>): String {
        fun permission(key: String) = if (policy[key] == true) " https:" else ""
        return "default-src 'self'; script-src 'self'; connect-src 'self'${permission("allowHttpsConnections")}; img-src 'self' data:${permission("allowHttpsImages")}; media-src 'self'${permission("allowHttpsMedia")}; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
    }
}
