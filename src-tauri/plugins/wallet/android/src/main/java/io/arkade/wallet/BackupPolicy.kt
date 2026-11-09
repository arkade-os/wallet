package io.arkade.wallet

import android.util.Base64
import java.nio.ByteBuffer
import java.nio.charset.CodingErrorAction
import java.nio.charset.StandardCharsets
import org.json.JSONObject

internal object BackupPolicy {
    const val MAX_BYTES = 32 * 1024 * 1024

    fun validate(contents: String) {
        require(contents.toByteArray(StandardCharsets.UTF_8).size <= MAX_BYTES)
        val value = JSONObject(contents)
        require(value.length() == 7 && value.opt("format") == "arkade-native-state" && value.opt("version") == 1
            && value.opt("kdf") == "PBKDF2-SHA256" && value.opt("iterations") == 600_000)
        for ((name, size) in listOf("salt" to 16, "iv" to 12, "ciphertext" to null)) {
            val raw = value.get(name)
            require(raw is String && raw.matches(Regex("[A-Za-z0-9+/]*={0,2}")) && raw.length % 4 == 0)
            val decoded = Base64.decode(raw, Base64.NO_WRAP)
            require(if (size == null) decoded.size >= 17 else decoded.size == size)
        }
    }

    fun requireName(name: String) {
        require(name.length in 1..128 && !name.startsWith('.') && name.endsWith(".json")
            && name.matches(Regex("[A-Za-z0-9._-]+")))
    }

    fun decode(bytes: ByteArray): String = StandardCharsets.UTF_8.newDecoder()
        .onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT)
        .decode(ByteBuffer.wrap(bytes)).toString().also { validate(it) }
}
