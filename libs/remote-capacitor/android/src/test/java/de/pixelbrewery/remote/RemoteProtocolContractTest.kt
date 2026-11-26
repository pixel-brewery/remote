package de.pixelbrewery.remote

// #region Imports
import de.pixelbrewery.remote.transport.RemotePeerPolicy
import de.pixelbrewery.remote.protocol.RemoteProtocolContract
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File
// #endregion

public class RemoteProtocolContractTest {
    @Test public fun canonicalZodVectorsHaveIdenticalNativeResults() {
        // Arrange
        val bundle = JSONObject(File("src/main/assets/remote-protocol-v1.json").readText())
        val contract = RemoteProtocolContract(bundle)
        val vectors = bundle.getJSONArray("vectors")
        // Act / Assert
        for (index in 0 until vectors.length()) {
            val vector = vectors.getJSONObject(index)
            val result = runCatching { contract.validate(vector.getString("schema"), vector.getJSONObject("value")) }.isSuccess
            assertEquals(vector.getString("name"), vector.getBoolean("valid"), result)
        }
    }
    @Test public fun peersRejectPublicLoopbackMappedAndAmbiguousAddresses() {
        // Arrange
        val rejected = listOf("http://127.0.0.1:1234", "http://8.8.8.8", "http://192.168.1.2.evil.test", "http://192.168.001.2", "http://[::ffff:192.168.1.1]", "http://192.168.1.1/secret", "http://user@192.168.1.1")
        // Act / Assert
        rejected.forEach { assertEquals(it, false, runCatching { RemotePeerPolicy.origin(it) }.isSuccess) }
        assertEquals(true, runCatching { RemotePeerPolicy.origin("http://192.168.1.2:4421") }.isSuccess)
    }
}
