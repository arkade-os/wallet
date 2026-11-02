package io.arkade.wallet;

import java.nio.charset.StandardCharsets;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import org.junit.Test;
import static org.junit.Assert.*;

public class VaultCodecTest {
    private SecretKey key() throws Exception {
        KeyGenerator generator = KeyGenerator.getInstance("AES");
        generator.init(256);
        return generator.generateKey();
    }

    @Test
    public void authenticatedCiphertextUsesFreshNonceAndRoundTrips() throws Exception {
        SecretKey key = key();
        byte[] plaintext = "test-encrypted-wallet-blob".getBytes(StandardCharsets.UTF_8);
        byte[] first = VaultCodec.encrypt(key, "encrypted_mnemonic", plaintext);
        byte[] second = VaultCodec.encrypt(key, "encrypted_mnemonic", plaintext);
        assertFalse(java.util.Arrays.equals(first, second));
        assertArrayEquals(plaintext, VaultCodec.decrypt(key, "encrypted_mnemonic", first));
        assertArrayEquals(plaintext, VaultCodec.decrypt(key, "encrypted_mnemonic", second));
    }

    @Test
    public void recordsCannotBeTamperedSwappedOrReadByAnotherKey() throws Exception {
        SecretKey key = key();
        byte[] blob = VaultCodec.encrypt(key, "encrypted_mnemonic", new byte[] {1, 2, 3});
        assertThrows(Exception.class, () -> VaultCodec.decrypt(key, "encrypted_private_key", blob));
        assertThrows(Exception.class, () -> VaultCodec.decrypt(key(), "encrypted_mnemonic", blob));
        blob[15] ^= 1;
        assertThrows(Exception.class, () -> VaultCodec.decrypt(key, "encrypted_mnemonic", blob));
        assertThrows(Exception.class, () -> VaultCodec.decrypt(key, "encrypted_mnemonic", new byte[28]));
    }

    @Test
    public void keyNamesAndUtf8ValueSizesAreBounded() {
        WalletPolicy.requireSecretKey("encrypted_private_key");
        assertThrows(IllegalArgumentException.class, () -> WalletPolicy.requireSecretKey("../encrypted_mnemonic"));
        assertThrows(IllegalArgumentException.class, () -> WalletPolicy.requireSecretValue(""));
        assertThrows(IllegalArgumentException.class, () -> WalletPolicy.requireSecretValue("é".repeat(1281)));
        WalletPolicy.requireSecretValue("é".repeat(1280));
    }
}
