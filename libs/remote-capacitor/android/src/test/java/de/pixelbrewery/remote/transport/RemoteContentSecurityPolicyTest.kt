package de.pixelbrewery.remote.transport

// #region Imports
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
// #endregion

public class RemoteContentSecurityPolicyTest {
    @Test public fun defaultAssetsDoNotAdmitPublicHttpsResources() {
        // Arrange / Act
        val policy = RemoteContentSecurityPolicy.packaged(emptyMap())
        // Assert
        assertFalse(policy.contains("https:"))
        assertTrue(policy.contains("script-src 'self';"))
        assertTrue(policy.contains("frame-ancestors 'none'"))
    }
    @Test public fun imageOptInDoesNotGrantMediaConnectionsOrScripts() {
        // Arrange / Act
        val policy = RemoteContentSecurityPolicy.packaged(mapOf("allowHttpsImages" to true))
        // Assert
        assertTrue(policy.contains("img-src 'self' data: https:;"))
        assertTrue(policy.contains("media-src 'self';"))
        assertTrue(policy.contains("connect-src 'self';"))
        assertTrue(policy.contains("script-src 'self';"))
        assertEquals(1, Regex("https:").findAll(policy).count())
    }
    @Test public fun allResourceOptInsStillDoNotAdmitScriptsOrObjects() {
        // Arrange / Act
        val policy = RemoteContentSecurityPolicy.packaged(mapOf("allowHttpsImages" to true, "allowHttpsMedia" to true, "allowHttpsConnections" to true))
        // Assert
        assertEquals(3, Regex("https:").findAll(policy).count())
        assertTrue(policy.contains("script-src 'self';"))
        assertTrue(policy.contains("object-src 'none';"))
    }
}
