package io.arkade.wallet

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

class AndroidSecretVault(context: Context) {
    private val preferences = context.getSharedPreferences("arkade_wallet_vault", Context.MODE_PRIVATE)
    private val alias = "io.arkade.wallet.vault.v1"

    private fun key(create: Boolean): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        val existing = store.getKey(alias, null)
        if (existing is SecretKey) return existing
        check(create && preferences.all.isEmpty()) { "Secure storage key unavailable" }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setRandomizedEncryptionRequired(true)
            .build())
        return generator.generateKey()
    }

    @Synchronized
    fun get(name: String): String? {
        WalletPolicy.requireSecretKey(name)
        val stored = preferences.getString(name, null) ?: return null
        check(stored.length <= 4000) { "Invalid vault record" }
        val plaintext = VaultCodec.decrypt(key(false), name, Base64.decode(stored, Base64.NO_WRAP))
        return try {
            String(plaintext, StandardCharsets.UTF_8).also { WalletPolicy.requireSecretValue(it) }
        } finally {
            plaintext.fill(0)
        }
    }

    @Synchronized
    fun set(name: String, value: String) {
        WalletPolicy.requireSecretKey(name)
        WalletPolicy.requireSecretValue(value)
        val plaintext = value.toByteArray(StandardCharsets.UTF_8)
        val blob = try { VaultCodec.encrypt(key(true), name, plaintext) } finally { plaintext.fill(0) }
        check(preferences.edit().putString(name, Base64.encodeToString(blob, Base64.NO_WRAP)).commit()) {
            "Secure storage write failed"
        }
    }

    @Synchronized
    fun remove(name: String) {
        WalletPolicy.requireSecretKey(name)
        check(preferences.edit().remove(name).commit()) { "Secure storage removal failed" }
    }
}
