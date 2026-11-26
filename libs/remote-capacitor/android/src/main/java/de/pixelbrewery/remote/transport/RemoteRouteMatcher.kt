package de.pixelbrewery.remote.transport

// #region Imports
import de.pixelbrewery.remote.configuration.RemoteNativeConfiguration
import de.pixelbrewery.remote.transport.RemotePeerPolicy
// #endregion

/** Native projection of RemoteRouteRegistry, verified against its generated shared admission vectors. */
internal object RemoteRouteMatcher {
    fun validateTemplate(path: String) { require(RemotePeerPolicy.path(path) == path && path != "/__remote" && !path.startsWith("/__remote/")); path.split('/').forEach { require(!it.startsWith(':') || it.matches(Regex(":[A-Za-z][A-Za-z0-9_]*"))) } }
    fun match(routes: List<RemoteNativeConfiguration.Route>, method: String, raw: String): RemoteNativeConfiguration.Route? {
        val path = runCatching { RemotePeerPolicy.path(raw) }.getOrNull() ?: return null
        val segments = path.split('/')
        val candidates = routes.filter { route -> route.method == method && route.path.split('/').let { template -> template.size == segments.size && template.indices.all { index -> if (template[index].startsWith(':')) segments[index].isNotEmpty() else template[index] == segments[index] } } }
        val priority = candidates.maxOfOrNull { route -> route.path.split('/').count { !it.startsWith(':') } } ?: return null
        return candidates.filter { route -> route.path.split('/').count { !it.startsWith(':') } == priority }.singleOrNull()
    }
}
