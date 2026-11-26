package de.pixelbrewery.remote.bridge

// #region Imports
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
// #endregion

public class RemoteLocalCookieTest {
    @Test public fun installsAPersistentBoundedCapabilityThatSurvivesSessionCookieRemoval() {
        // Arrange
        val capability = "a".repeat(64)
        // Act
        val header = RemoteLocalCookie.header(capability)
        // Assert: removeSessionCookies() only removes cookies without Max-Age/Expires.
        assertEquals("remote_local=$capability; Path=/; Max-Age=43200; HttpOnly; SameSite=Strict", header)
        assertTrue(RemoteLocalCookie.MAX_AGE_SECONDS in 1L..86_400L)
    }

    @Test public fun expiresTheCapabilityImmediatelyWithTheSameScope() {
        // Arrange / Act
        val header = RemoteLocalCookie.expiredHeader()
        // Assert
        assertTrue(header.startsWith("remote_local=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT;"))
        assertTrue(header.endsWith("HttpOnly; SameSite=Strict"))
    }

    @Test public fun rejectsHeaderInjectionAndNonLoopbackOrigins() {
        // Arrange / Act / Assert
        assertThrows(IllegalArgumentException::class.java) { RemoteLocalCookie.header("injected; Path=/") }
        assertThrows(IllegalArgumentException::class.java) { RemoteLocalCookie.header("A".repeat(64)) }
        assertTrue(RemoteLocalCookie.isLoopbackOrigin("http://127.0.0.1:4242"))
        for (origin in listOf("http://192.168.1.1:4242", "https://127.0.0.1:4242", "http://127.0.0.1", "http://127.0.0.1:4242/", "http://user@127.0.0.1:4242", "http://127.0.0.1:4242?x", "not a url"))
            assertFalse(origin, RemoteLocalCookie.isLoopbackOrigin(origin))
    }
}
