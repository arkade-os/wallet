package io.arkade.wallet

import android.content.Context
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AndroidSecretVaultTest {
    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private val name = "encrypted_mnemonic"
    private val other = "encrypted_private_key"
    private val preferences get() = context.getSharedPreferences("arkade_wallet_vault", Context.MODE_PRIVATE)

    @Before
    fun prepare() {
        check(context.packageName == "io.arkade.wallet.vault.test")
        preferences.edit().clear().commit()
    }

    @After
    fun cleanup() {
        preferences.edit().clear().commit()
    }

    @Test
    fun persistsThroughRecreationAndDeletesBothFormats() {
        val vault = AndroidSecretVault(context)
        assertNull(vault.get(name))
        vault.set(name, "test-encrypted-mnemonic-blob")
        vault.set(other, "test-encrypted-private-key-blob")
        assertFalse(preferences.getString(name, "")!!.contains("test-encrypted-mnemonic-blob"))
        val recreated = AndroidSecretVault(context)
        assertEquals("test-encrypted-mnemonic-blob", recreated.get(name))
        assertEquals("test-encrypted-private-key-blob", recreated.get(other))
        recreated.set(name, "replacement-encrypted-blob")
        assertEquals("replacement-encrypted-blob", AndroidSecretVault(context).get(name))
        recreated.remove(name)
        recreated.remove(other)
        assertNull(AndroidSecretVault(context).get(name))
        assertNull(AndroidSecretVault(context).get(other))
    }

    @Test
    fun tamperingFailsClosedWithoutRemovingTheStoredRecord() {
        val vault = AndroidSecretVault(context)
        vault.set(name, "test-encrypted-blob")
        val original = preferences.getString(name, null)!!
        preferences.edit().putString(name, original.dropLast(4) + "AAAA").commit()
        assertThrows(Exception::class.java) { AndroidSecretVault(context).get(name) }
        assertTrue(preferences.contains(name))
        preferences.edit().putString(name, original).commit()
        assertEquals("test-encrypted-blob", AndroidSecretVault(context).get(name))
    }

    @Test
    fun backupDocumentsMustContainOnlyTheEncryptedEnvelope() {
        val envelope = org.json.JSONObject().apply {
            put("format", "arkade-native-state")
            put("version", 1)
            put("kdf", "PBKDF2-SHA256")
            put("iterations", 600_000)
            put("salt", android.util.Base64.encodeToString(ByteArray(16), android.util.Base64.NO_WRAP))
            put("iv", android.util.Base64.encodeToString(ByteArray(12), android.util.Base64.NO_WRAP))
            put("ciphertext", android.util.Base64.encodeToString(ByteArray(17), android.util.Base64.NO_WRAP))
        }
        BackupPolicy.validate(envelope.toString())
        envelope.put("mnemonic", "plaintext")
        assertThrows(Exception::class.java) { BackupPolicy.validate(envelope.toString()) }
        assertThrows(Exception::class.java) { BackupPolicy.validate("{\"mnemonic\":\"plaintext\"}") }
        assertThrows(Exception::class.java) { BackupPolicy.decode(byteArrayOf(0xc0.toByte(), 0xaf.toByte())) }
        assertThrows(Exception::class.java) { BackupPolicy.requireName("../wallet.json") }
    }
}
