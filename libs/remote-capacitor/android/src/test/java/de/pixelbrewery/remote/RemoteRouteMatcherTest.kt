package de.pixelbrewery.remote

// #region Imports
import de.pixelbrewery.remote.configuration.RemoteNativeConfiguration
import de.pixelbrewery.remote.transport.RemoteRouteMatcher
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File
// #endregion

public class RemoteRouteMatcherTest {
    @Test public fun canonicalRouteRegistryVectorsHaveIdenticalNativeAdmission() {
        // Arrange
        val vectors = JSONObject(File("src/main/assets/remote-protocol-v1.json").readText()).getJSONArray("routeMatchVectors")
        // Act / Assert
        for (index in 0 until vectors.length()) {
            val vector = vectors.getJSONObject(index)
            val input = vector.getJSONArray("routes")
            val routes = (0 until input.length()).map { position -> val value = input.getJSONObject(position); RemoteNativeConfiguration.Route(value.getString("id"), value.getString("method"), value.getString("path"), value.getString("kind"), emptySet()) }
            val actual = RemoteRouteMatcher.match(routes, vector.getString("method"), vector.getString("path"))?.id
            val expected = if (vector.isNull("operationId")) null else vector.getString("operationId")
            assertEquals(vector.getString("name"), expected, actual)
        }
    }
}
