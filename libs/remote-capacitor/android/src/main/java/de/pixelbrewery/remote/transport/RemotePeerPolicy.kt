package de.pixelbrewery.remote.transport

// #region Imports
import java.net.InetAddress
import java.net.URI
import java.net.URLDecoder
// #endregion

/** Numeric private-address admission avoids DNS rebinding and redirect authority changes. */
internal object RemotePeerPolicy {
    fun origin(value: String): URI {
        val uri = URI(value)
        require(uri.scheme in setOf("http", "https") && uri.rawUserInfo == null && uri.rawQuery == null && uri.rawFragment == null && uri.rawPath.isNullOrEmpty())
        val host = requireNotNull(uri.host).removePrefix("[").removeSuffix("]")
        require(!host.contains('%'))
        val address = if (host.contains(':')) { require(host.matches(Regex("[0-9a-fA-F:]+"))); InetAddress.getByName(host) } else {
            val pieces = host.split('.')
            require(pieces.size == 4 && pieces.all { it.matches(Regex("0|[1-9][0-9]{0,2}")) && it.toInt() <= 255 })
            InetAddress.getByAddress(pieces.map { it.toInt().toByte() }.toByteArray())
        }
        val bytes = address.address.map { it.toInt() and 255 }
        val admitted = if (!host.contains(':') && bytes.size == 4) bytes[0] == 10 || bytes[0] == 172 && bytes[1] in 16..31 || bytes[0] == 192 && bytes[1] == 168
            else bytes.size == 16 && bytes[0] and 254 == 252
        require(admitted && !address.isLoopbackAddress && !address.isMulticastAddress && !address.isAnyLocalAddress)
        require(uri.port == -1 || uri.port in 1..65535)
        return uri
    }
    fun path(value: String): String {
        require(value.length <= 16_384 && value.none { it.code <= 32 || it.code == 127 } && !value.contains('#'))
        val raw = value.substringBefore('?')
        require(raw.startsWith('/') && !raw.startsWith("//") && !raw.contains('\\') && !Regex("%2f|%5c", RegexOption.IGNORE_CASE).containsMatchIn(raw))
        val output = java.io.ByteArrayOutputStream(); var index = 0
        while (index < raw.length) { if (raw[index] == '%') { require(index + 2 < raw.length); output.write(raw.substring(index + 1, index + 3).toInt(16)); index += 3 } else { val code = raw.codePointAt(index); output.write(String(Character.toChars(code)).toByteArray(Charsets.UTF_8)); index += Character.charCount(code) } }
        val decoded = Charsets.UTF_8.newDecoder().onMalformedInput(java.nio.charset.CodingErrorAction.REPORT).decode(java.nio.ByteBuffer.wrap(output.toByteArray())).toString()
        require(decoded.none { it in "%?#" } && !decoded.contains("//") && !decoded.contains('\\') && decoded.split('/').none { it == "." || it == ".." } && decoded.none { it.code <= 32 || it.code == 127 })
        return decoded
    }
}
