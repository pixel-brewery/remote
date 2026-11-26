package de.pixelbrewery.remote.credentials

// #region Imports
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import android.util.Base64
import org.json.JSONObject
import java.io.File
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
// #endregion

/** Installation-private encrypted records; only AES ciphertext enters the application filesystem. */
internal class RemoteSecureStore(directory: File, appId: String) {
    private val _file: AtomicFile
    private val _key: SecretKey
    init {
        require(directory.mkdirs() || directory.isDirectory)
        val digest = java.security.MessageDigest.getInstance("SHA-256").digest(appId.toByteArray()).joinToString("") { "%02x".format(it) }
        _file = AtomicFile(File(directory, "remote-$digest.json"))
        val alias = "de.pixelbrewery.remote.$digest"
        val keys = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        _key = (keys.getKey(alias, null) as? SecretKey) ?: KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setRandomizedEncryptionRequired(true).build())
        }.generateKey()
    }
    @Synchronized fun read(): JSONObject {
        if (!_file.baseFile.exists()) return JSONObject()
        require(_file.baseFile.length() <= 2_097_152)
        val record = JSONObject(String(_file.readFully(), Charsets.UTF_8))
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.DECRYPT_MODE, _key, GCMParameterSpec(128, Base64.decode(record.getString("iv"), Base64.NO_WRAP))) }
        return JSONObject(String(cipher.doFinal(Base64.decode(record.getString("ciphertext"), Base64.NO_WRAP)), Charsets.UTF_8))
    }
    @Synchronized fun write(value: JSONObject) {
        val bytes = value.toString().toByteArray(); require(bytes.size <= 1_048_576)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, _key) }
        val record = JSONObject().put("iv", Base64.encodeToString(cipher.iv, Base64.NO_WRAP)).put("ciphertext", Base64.encodeToString(cipher.doFinal(bytes), Base64.NO_WRAP)).toString().toByteArray()
        val output = _file.startWrite()
        try { output.write(record); _file.finishWrite(output) } catch (error: Throwable) { _file.failWrite(output); throw error }
    }
}
