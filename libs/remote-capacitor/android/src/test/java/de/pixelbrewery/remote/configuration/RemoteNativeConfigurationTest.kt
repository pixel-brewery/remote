package de.pixelbrewery.remote.configuration

// #region Imports
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import java.io.File
import java.nio.file.Files
// #endregion

public class RemoteNativeConfigurationTest {
    @Test public fun acceptsA64MiBStreamQuotaAndRejectsOneByteMore() {
        // Arrange
        val directory = Files.createTempDirectory("remote-native-route-").toFile()
        fun configuration(bytes: Long) = RemoteNativeConfiguration("example", directory, File(directory, "credentials"), listOf(RemoteNativeConfiguration.Route("upload", "POST", "/api/upload", "http", setOf("write"), bytes)))
        try {
            // Act
            val accepted = configuration(67_108_864)
            // Assert: only metadata is constructed; no request-body buffer is allocated.
            assertEquals(67_108_864, accepted.routes.single().maxRequestBytes)
            assertThrows(IllegalArgumentException::class.java) { configuration(67_108_865) }
        } finally { directory.deleteRecursively() }
    }
}
