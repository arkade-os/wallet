package io.arkade.wallet;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

public final class VaultCodec {
    public static byte[] encrypt(SecretKey key, String name, byte[] plaintext) throws GeneralSecurityException {
        WalletPolicy.requireSecretKey(name);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key);
        cipher.updateAAD(aad(name));
        byte[] nonce = cipher.getIV();
        if (nonce.length != 12) throw new GeneralSecurityException("Invalid vault nonce");
        byte[] ciphertext = cipher.doFinal(plaintext);
        byte[] output = new byte[1 + nonce.length + ciphertext.length];
        output[0] = 1;
        System.arraycopy(nonce, 0, output, 1, nonce.length);
        System.arraycopy(ciphertext, 0, output, 13, ciphertext.length);
        return output;
    }

    public static byte[] decrypt(SecretKey key, String name, byte[] blob) throws GeneralSecurityException {
        WalletPolicy.requireSecretKey(name);
        if (blob.length < 29 || blob.length > WalletPolicy.SECRET_LIMIT + 29 || blob[0] != 1) {
            throw new GeneralSecurityException("Invalid vault record");
        }
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, Arrays.copyOfRange(blob, 1, 13)));
        cipher.updateAAD(aad(name));
        return cipher.doFinal(blob, 13, blob.length - 13);
    }

    private static byte[] aad(String name) {
        return ("io.arkade.wallet.v1:" + name).getBytes(StandardCharsets.UTF_8);
    }

    private VaultCodec() {}
}
