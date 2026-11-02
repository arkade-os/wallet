package io.arkade.satochip;

import static org.junit.Assert.*;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigInteger;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.bouncycastle.asn1.ASN1Integer;
import org.bouncycastle.asn1.DERSequence;
import org.bouncycastle.asn1.sec.SECNamedCurves;
import org.bouncycastle.asn1.x9.X9ECParameters;
import org.bouncycastle.crypto.digests.SHA256Digest;
import org.bouncycastle.crypto.params.ECDomainParameters;
import org.bouncycastle.crypto.params.ECPrivateKeyParameters;
import org.bouncycastle.crypto.signers.ECDSASigner;
import org.bouncycastle.crypto.signers.HMacDSAKCalculator;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.junit.Test;
import org.satochip.io.APDUCommand;
import org.satochip.io.APDUException;
import org.satochip.io.APDUResponse;
import org.satochip.io.BlockedPINException;
import org.satochip.io.CardChannel;
import org.satochip.io.WrongPINException;
import org.satochip.io.WrongPINLegacyException;

public class CardSessionTest {
    private static byte[] initializedStatus() {
        byte[] status = new byte[18];
        status[1] = 16;
        status[3] = 1;
        status[9] = 1;
        status[10] = 1;
        return status;
    }

    private static final class Commands implements CardSession.Commands {
        byte[] status = initializedStatus();
        byte[] key = new byte[33];
        boolean wrongPin;
        int verifies;
        boolean pinCleared;
        Exception selectFailure;
        Exception statusFailure;
        Exception secureFailure;
        Exception pinFailure;
        Exception deriveFailure;
        CountDownLatch signingStarted;
        CountDownLatch finishSigning;
        final List<String> actions = new ArrayList<>();

        Commands() { key[0] = 2; key[32] = 1; }
        public void select() throws Exception { actions.add("select"); if (selectFailure != null) throw selectFailure; }
        public byte[] status() throws Exception { actions.add("status"); if (statusFailure != null) throw statusFailure; return status.clone(); }
        public void verifyPin(byte[] pin) throws Exception {
            actions.add("verify");
            verifies++;
            if (pinFailure != null) throw pinFailure;
            if (wrongPin) throw new IOException("wrong PIN");
        }
        public void clearPin() { pinCleared = true; }
        public void secureChannel() throws Exception { actions.add("secure"); if (secureFailure != null) throw secureFailure; }
        public void setup(byte[] pin, byte[] puk) { actions.add("setup"); status[10] = 1; }
        public void importSeed(byte[] seed) { actions.add("import"); status[9] = 1; }
        public byte[] derive() throws Exception { actions.add("derive"); if (deriveFailure != null) throw deriveFailure; return key.clone(); }
        public void tweak(byte[] tweak, boolean bypass) { actions.add("tweak:" + bypass + ":" + tweak.length); }
        public byte[] schnorr(byte[] hash) throws Exception {
            actions.add("schnorr");
            if (signingStarted != null) {
                signingStarted.countDown();
                if (!finishSigning.await(5, TimeUnit.SECONDS)) throw new IOException("signing test timed out");
            }
            return new byte[64];
        }
        public byte[] ecdsa(byte[] hash) { actions.add("ecdsa"); return new byte[] {0x30, 6, 2, 1, 1, 2, 1, 1}; }
        public void disconnect() { actions.add("disconnect"); }
    }

    private static final class Channel implements CardChannel {
        boolean connected = true;
        int sends;
        public APDUResponse send(APDUCommand command) {
            sends++;
            return new APDUResponse(new byte[] {(byte) 0x90, 0});
        }
        public boolean isConnected() { return connected; }
    }

    private BoundedCardChannel channel() {
        Channel delegate = new Channel();
        return new BoundedCardChannel(delegate, () -> delegate.connected = false);
    }

    private CardSession session(Commands commands) throws Exception {
        return new CardSession(commands, channel(), "123456".getBytes("US-ASCII"));
    }

    private static final class SecureCard implements CardChannel {
        final X9ECParameters curve = SECNamedCurves.getByName("secp256k1");
        final BigInteger ephemeral = BigInteger.valueOf(3);
        final boolean resetAfterPin;
        int handshakes;
        int encryptedVerifies;
        int plainVerifies;
        byte[] encryptionKey;
        byte[] macKey;

        SecureCard(boolean resetAfterPin) { this.resetAfterPin = resetAfterPin; }
        public boolean isConnected() { return true; }
        public APDUResponse send(APDUCommand command) throws IOException {
            try {
                if (command.getIns() == 0x3c) {
                    byte[] status = initializedStatus();
                    status[11] = 1;
                    return new APDUResponse(status, (byte) 0x90, (byte) 0);
                }
                if (command.getIns() == 0x81) {
                    handshakes++;
                    byte[] shared = curve.getCurve().decodePoint(command.getData()).multiply(ephemeral)
                        .normalize().getAffineXCoord().getEncoded();
                    encryptionKey = Arrays.copyOf(hmac(shared, "sc_key".getBytes("US-ASCII")), 16);
                    macKey = hmac(shared, "sc_mac".getBytes("US-ASCII"));
                    byte[] point = curve.getG().multiply(ephemeral).normalize().getEncoded(false);
                    byte[] message = sized(Arrays.copyOfRange(point, 1, 33));
                    byte[] signed = concat(message, sized(signature(message, ephemeral)));
                    return new APDUResponse(concat(signed, sized(signature(signed, BigInteger.valueOf(5)))), (byte) 0x90, (byte) 0);
                }
                if (command.getIns() == 0x82) {
                    encryptedVerifies++;
                    byte[] data = command.getData();
                    int encryptedLength = ((data[16] & 255) << 8) | (data[17] & 255);
                    int macOffset = 18 + encryptedLength;
                    assertEquals(macOffset + 22, data.length);
                    assertEquals(0, data[macOffset]);
                    assertEquals(20, data[macOffset + 1]);
                    assertArrayEquals(hmac(macKey, Arrays.copyOf(data, macOffset)), Arrays.copyOfRange(data, macOffset + 2, data.length));
                    Cipher cipher = Cipher.getInstance("AES/CBC/PKCS7Padding", new BouncyCastleProvider());
                    cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(encryptionKey, "AES"), new IvParameterSpec(Arrays.copyOf(data, 16)));
                    assertArrayEquals(new APDUCommand(0xb0, 0x42, 0, 0, "123456".getBytes("US-ASCII")).serialize(),
                        cipher.doFinal(Arrays.copyOfRange(data, 18, macOffset)));
                    return new APDUResponse(new byte[] {(byte) (resetAfterPin ? 0x9c : 0x90), (byte) (resetAfterPin ? 0x21 : 0)});
                }
                if (command.getIns() == 0x42) plainVerifies++;
                assertEquals(0xa4, command.getIns());
                return new APDUResponse(new byte[] {(byte) 0x90, 0});
            } catch (Exception error) {
                throw new IOException("Secure-channel fixture failed", error);
            }
        }

        private byte[] signature(byte[] message, BigInteger secret) throws Exception {
            ECDomainParameters domain = new ECDomainParameters(curve.getCurve(), curve.getG(), curve.getN(), curve.getH());
            ECDSASigner signer = new ECDSASigner(new HMacDSAKCalculator(new SHA256Digest()));
            signer.init(true, new ECPrivateKeyParameters(secret, domain));
            BigInteger[] signature = signer.generateSignature(MessageDigest.getInstance("SHA-256").digest(message));
            return new DERSequence(new ASN1Integer[] {new ASN1Integer(signature[0]), new ASN1Integer(signature[1])}).getEncoded();
        }

        private static byte[] hmac(byte[] key, byte[] data) throws Exception {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            return mac.doFinal(data);
        }

        private static byte[] sized(byte[] data) throws IOException {
            return concat(new byte[] {(byte) (data.length >> 8), (byte) data.length}, data);
        }

        private static byte[] concat(byte[]... values) throws IOException {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            for (byte[] value : values) bytes.write(value);
            return bytes.toByteArray();
        }
    }

    @Test
    public void officialSecureChannelEncryptsAndAuthenticatesExactlyOneExplicitPin() throws Exception {
        SecureCard card = new SecureCard(false);
        BoundedCardChannel channel = new BoundedCardChannel(card, () -> {});
        CardSession.Commands commands = CardSession.official(channel);
        byte[] pin = "123456".getBytes("US-ASCII");
        try {
            channel.begin();
            commands.select();
            commands.status();
            commands.secureChannel();
            commands.verifyPin(pin);
            assertEquals(1, card.handshakes);
            assertEquals(1, card.encryptedVerifies);
            assertEquals(0, card.plainVerifies);
        } finally {
            commands.clearPin();
            commands.disconnect();
        }
        assertArrayEquals(new byte[6], pin);
    }

    @Test
    public void officialEncryptedPinCannotBeResentWhenTheCardRequestsASecureChannelReset() throws Exception {
        SecureCard card = new SecureCard(true);
        BoundedCardChannel channel = new BoundedCardChannel(card, () -> {});
        CardSession.Commands commands = CardSession.official(channel);
        byte[] pin = "123456".getBytes("US-ASCII");
        try {
            channel.begin();
            commands.select();
            commands.status();
            commands.secureChannel();
            Exception error = assertThrows(Exception.class, () -> commands.verifyPin(pin));
            assertTrue(CardFailure.message(CardFailure.at(CardFailure.Phase.VERIFY_PIN, error)).contains("could not be confirmed"));
            assertEquals(1, card.encryptedVerifies);
            assertEquals(0, card.plainVerifies);
        } finally {
            commands.clearPin();
            commands.disconnect();
        }
        assertArrayEquals(new byte[6], pin);
    }

    @Test
    public void parsesSupportedStatusWithoutTreatingPolicyOneAsEnabled() {
        byte[] data = initializedStatus();
        CardPolicy policy = new CardPolicy(data);
        assertEquals("0.16-0.1", policy.version);
        assertTrue(policy.ready());
        data[13] = 1;
        assertFalse(new CardPolicy(data).ready());
        data[13] = 0;
        data[14] = 1;
        assertFalse(new CardPolicy(data).ready());
    }

    @Test
    public void rejectsOldIncompleteAndUninitializedCardsBeforePin() throws Exception {
        for (int field : new int[] {1, 8, 9, 10, 13, 14}) {
            Commands commands = new Commands();
            if (field == 1) commands.status[field] = 15;
            else if (field == 9 || field == 10) commands.status[field] = 0;
            else commands.status[field] = 1;
            assertThrows(IllegalStateException.class, () -> session(commands));
            assertEquals(0, commands.verifies);
        }
        Commands truncated = new Commands();
        truncated.status = new byte[15];
        assertThrows(IllegalArgumentException.class, () -> session(truncated));
        assertEquals(0, truncated.verifies);
    }

    @Test
    public void authenticatesOnceAndClearsPinBytes() throws Exception {
        Commands commands = new Commands();
        byte[] pin = "123456".getBytes("US-ASCII");
        try (CardSession current = new CardSession(commands, channel(), pin)) {
            assertEquals(1, commands.verifies);
            assertTrue(commands.pinCleared);
            assertArrayEquals(new byte[6], pin);
            current.publicKey();
            current.status();
            assertEquals(1, commands.verifies);
        }
    }

    @Test
    public void requiredSecureChannelIsEstablishedBeforeTheOnlyPinVerification() throws Exception {
        Commands commands = new Commands();
        commands.status[11] = 1;
        try (CardSession current = session(commands)) {
            assertEquals(Arrays.asList("select", "status", "secure", "verify", "derive"), commands.actions);
            assertEquals(1, commands.verifies);
        }
    }

    @Test
    public void officialConnectorCannotResendAnExplicitPinAfterSecureChannelReset() throws Exception {
        int[] verifies = {0};
        CardChannel scripted = new CardChannel() {
            public boolean isConnected() { return true; }
            public APDUResponse send(APDUCommand command) {
                if (command.getIns() == 0x3c) return new APDUResponse(initializedStatus(), (byte) 0x90, (byte) 0);
                if (command.getIns() == 0x42) verifies[0]++;
                return new APDUResponse(new byte[] {(byte) 0x9c, 0x21});
            }
        };
        BoundedCardChannel channel = new BoundedCardChannel(scripted, () -> {});
        channel.begin();
        CardSession.Commands commands = CardSession.official(channel);
        try {
            assertThrows(Exception.class, () -> commands.verifyPin("123456".getBytes("US-ASCII")));
            assertEquals(1, verifies[0]);
        } finally {
            commands.clearPin();
            commands.disconnect();
        }
    }

    @Test
    public void officialPinResponsesDistinguishKnownRejectionBlockingAndTransportLoss() throws Exception {
        for (int result : new int[] {0x63c2, 0x9c02, 0x9c0c, 0}) {
            int[] verifies = {0};
            CardChannel scripted = new CardChannel() {
                public boolean isConnected() { return true; }
                public APDUResponse send(APDUCommand command) throws IOException {
                    if (command.getIns() == 0x3c) return new APDUResponse(initializedStatus(), (byte) 0x90, (byte) 0);
                    assertEquals(0x42, command.getIns());
                    verifies[0]++;
                    if (result == 0) throw new IOException("private fixture payload");
                    return new APDUResponse(new byte[] {(byte) (result >> 8), (byte) result});
                }
            };
            BoundedCardChannel channel = new BoundedCardChannel(scripted, () -> {});
            CardSession.Commands commands = CardSession.official(channel);
            byte[] pin = "123456".getBytes("US-ASCII");
            try {
                channel.begin();
                Exception error = assertThrows(Exception.class, () -> commands.verifyPin(pin));
                String message = CardFailure.message(CardFailure.at(CardFailure.Phase.VERIFY_PIN, error));
                if (result == 0x63c2) {
                    assertTrue(error instanceof WrongPINException);
                    assertTrue(message.contains("2 attempts remaining"));
                } else if (result == 0x9c02) {
                    assertTrue(error instanceof WrongPINLegacyException);
                    assertTrue(message.contains("rejected the PIN"));
                } else if (result == 0x9c0c) {
                    assertTrue(error instanceof BlockedPINException);
                    assertTrue(message.contains("PIN is blocked"));
                } else {
                    assertTrue(error instanceof APDUException);
                    assertEquals(0, ((APDUException) error).sw);
                    assertTrue(message.contains("could not be confirmed"));
                    assertFalse(message.contains("rejected the PIN"));
                }
                assertFalse(message.contains("private fixture payload"));
                assertEquals(1, verifies[0]);
            } finally {
                commands.clearPin();
                commands.disconnect();
            }
            assertArrayEquals(new byte[6], pin);
        }
    }

    @Test
    public void officialUnknownPinStatusCannotMasqueradeAsARetryCount() throws Exception {
        for (int result : new int[] {0xffff, 0x63ff}) {
            int[] verifies = {0};
            CardChannel scripted = new CardChannel() {
                public boolean isConnected() { return true; }
                public APDUResponse send(APDUCommand command) {
                    if (command.getIns() == 0x3c) return new APDUResponse(initializedStatus(), (byte) 0x90, (byte) 0);
                    assertEquals(0x42, command.getIns());
                    verifies[0]++;
                    return new APDUResponse(new byte[] {(byte) (result >> 8), (byte) result});
                }
            };
            BoundedCardChannel channel = new BoundedCardChannel(scripted, () -> {});
            CardSession.Commands commands = CardSession.official(channel);
            byte[] pin = "123456".getBytes("US-ASCII");
            try {
                channel.begin();
                Exception error = assertThrows(Exception.class, () -> commands.verifyPin(pin));
                String message = CardFailure.message(CardFailure.at(CardFailure.Phase.VERIFY_PIN, error));
                assertTrue(message, message.contains("could not be confirmed"));
                assertTrue(message.contains(String.format("0x%04X", result)));
                assertFalse(message.contains("rejected the PIN"));
                assertFalse(message.contains("attempts remaining"));
                assertFalse(message.contains("PIN is blocked"));
                assertEquals(1, verifies[0]);
            } finally {
                commands.clearPin();
                commands.disconnect();
            }
            assertArrayEquals(new byte[6], pin);
        }
    }

    @Test
    public void preAuthenticationFailuresIdentifyThePhaseWithoutCheckingOrRetainingThePin() throws Exception {
        for (CardFailure.Phase phase : new CardFailure.Phase[] {CardFailure.Phase.SELECT, CardFailure.Phase.STATUS, CardFailure.Phase.SECURE_CHANNEL}) {
            Commands commands = new Commands();
            commands.status[11] = 1;
            IOException failure = new IOException("private fixture payload");
            if (phase == CardFailure.Phase.SELECT) commands.selectFailure = failure;
            else if (phase == CardFailure.Phase.STATUS) commands.statusFailure = failure;
            else commands.secureFailure = failure;
            byte[] pin = "123456".getBytes("US-ASCII");
            BoundedCardChannel transport = channel();
            Exception error = assertThrows(CardFailure.class, () -> new CardSession(commands, transport, pin));
            String message = CardFailure.message(error);
            assertTrue(message.contains("[" + phase + "]"));
            assertTrue(message.contains("The PIN was not checked"));
            assertFalse(message.contains("private fixture payload"));
            assertEquals(0, commands.verifies);
            assertArrayEquals(new byte[6], pin);
            assertTrue(commands.pinCleared);
            assertFalse(transport.isConnected());
        }
    }

    @Test
    public void uncertainPinVerificationDoesNotClaimThePinWasRejectedOrNeverChecked() throws Exception {
        for (Exception failure : new Exception[] {new IOException("private fixture payload"), new APDUException(0, "private fixture payload")}) {
            Commands commands = new Commands();
            commands.pinFailure = failure;
            byte[] pin = "123456".getBytes("US-ASCII");
            Exception error = assertThrows(CardFailure.class, () -> new CardSession(commands, channel(), pin));
            String message = CardFailure.message(error);
            assertTrue(message.contains("PIN verification could not be confirmed"));
            assertTrue(message.contains("[VERIFY_PIN]"));
            assertTrue(message.contains("no automatic PIN retry"));
            assertFalse(message.contains("PIN was not checked"));
            assertFalse(message.contains("rejected the PIN"));
            assertFalse(message.contains("private fixture payload"));
            assertFalse(message.contains("0x0000"));
            assertEquals(1, commands.verifies);
            assertArrayEquals(new byte[6], pin);
        }
    }

    @Test
    public void knownPinRejectionAndBlockingRemainDistinctAndAreNeverRetried() throws Exception {
        Exception[] failures = {new WrongPINException(2), new WrongPINLegacyException(), new BlockedPINException(), new APDUException(0x6983, "private fixture payload")};
        for (Exception failure : failures) {
            Commands commands = new Commands();
            commands.pinFailure = failure;
            Exception error = assertThrows(CardFailure.class, () -> session(commands));
            String message = CardFailure.message(error);
            assertTrue(message.contains("[VERIFY_PIN]"));
            assertFalse(message.contains("could not be confirmed"));
            assertFalse(message.contains("private fixture payload"));
            if (failure instanceof WrongPINException) assertTrue(message.contains("2 attempts remaining"));
            else if (failure instanceof WrongPINLegacyException) assertTrue(message.contains("rejected the PIN"));
            else assertTrue(message.contains("PIN is blocked"));
            assertEquals(1, commands.verifies);
            assertTrue(commands.pinCleared);
        }
        assertTrue(CardFailure.message(new WrongPINException(0)).contains("PIN is blocked"));
    }

    @Test
    public void keyReadFailuresReportSuccessfulAuthenticationWithoutRetainingThePin() throws Exception {
        Commands commands = new Commands();
        commands.deriveFailure = new IOException("private fixture payload");
        byte[] pin = "123456".getBytes("US-ASCII");
        Exception error = assertThrows(CardFailure.class, () -> new CardSession(commands, channel(), pin));
        assertTrue(CardFailure.message(error).contains("PIN was accepted"));
        assertTrue(CardFailure.message(error).contains("[DERIVE_KEY]"));
        assertFalse(CardFailure.message(error).contains("private fixture payload"));
        assertArrayEquals(new byte[6], pin);
        assertEquals(1, commands.verifies);

        Commands later = new Commands();
        CardSession current = session(later);
        later.statusFailure = new IOException("private fixture payload");
        Exception readError = assertThrows(CardFailure.class, current::publicKey);
        assertTrue(CardFailure.message(readError).contains("PIN was accepted"));
        assertEquals(1, later.verifies);
    }

    @Test
    public void inspectionErrorsArePreAuthenticationAndExposeOnlyThePublicStatusWord() throws Exception {
        Commands commands = new Commands();
        commands.statusFailure = new APDUException(0x6a82, "private fixture payload");
        Exception error = assertThrows(CardFailure.class, () -> CardSession.inspect(commands, channel()));
        String message = CardFailure.message(error);
        assertTrue(message.contains("[STATUS]"));
        assertTrue(message.contains("0x6A82"));
        assertTrue(message.contains("PIN was not checked"));
        assertFalse(message.contains("private fixture payload"));
        assertEquals(0, commands.verifies);
        assertEquals("validation", CardFailure.message(new IllegalStateException("validation")));
    }

    @Test
    public void officialSecureChannelRejectsAnErrorResponseBeforePinVerification() throws Exception {
        int[] verifies = {0};
        CardChannel scripted = new CardChannel() {
            public boolean isConnected() { return true; }
            public APDUResponse send(APDUCommand command) {
                if (command.getIns() == 0x42 || command.getIns() == 0x82) verifies[0]++;
                return new APDUResponse(new byte[] {0x6a, (byte) 0x82});
            }
        };
        BoundedCardChannel channel = new BoundedCardChannel(scripted, () -> {});
        channel.begin();
        CardSession.Commands commands = CardSession.official(channel);
        Exception error = assertThrows(IOException.class, commands::secureChannel);
        assertTrue(CardFailure.message(CardFailure.at(CardFailure.Phase.SECURE_CHANNEL, error)).contains("0x6A82"));
        assertEquals(0, verifies[0]);
        commands.disconnect();
    }

    @Test
    public void inspectsAnEmptyCardWithoutAuthenticationOrWriting() throws Exception {
        Commands commands = new Commands();
        commands.status[9] = 0;
        commands.status[10] = 0;
        CardPolicy policy = CardSession.inspect(commands, channel());
        assertFalse(policy.seeded);
        assertFalse(policy.setupDone);
        assertEquals(Arrays.asList("select", "status"), commands.actions);
        assertEquals(0, commands.verifies);
    }

    @Test
    public void setsUpOnlyAnEmptyCardAndClearsAllProvidedSecrets() throws Exception {
        Commands commands = new Commands();
        commands.status[9] = 0;
        commands.status[10] = 0;
        commands.status[11] = 1;
        byte[] pin = "123456".getBytes("US-ASCII");
        byte[] puk = "abcdef0123456789".getBytes("US-ASCII");
        byte[] seed = new byte[64];
        Arrays.fill(seed, (byte) 7);
        CardSession.SetupResult result = CardSession.setup(commands, channel(), pin, puk, seed);
        assertTrue(result.policy.ready());
        assertArrayEquals(commands.key, result.publicKey);
        assertNotSame(commands.key, result.publicKey);
        assertEquals(Arrays.asList("status", "secure", "setup", "verify", "import", "status", "derive"), commands.actions);
        assertEquals(1, commands.verifies);
        assertArrayEquals(new byte[6], pin);
        assertArrayEquals(new byte[16], puk);
        assertArrayEquals(new byte[64], seed);
    }

    @Test
    public void resumesSeedImportWithoutReplacingAnExistingPinOrRecoveryCode() throws Exception {
        Commands commands = new Commands();
        commands.status[9] = 0;
        commands.status[11] = 1;
        CardSession.SetupResult result = CardSession.setup(commands, channel(), "123456".getBytes("US-ASCII"), null, new byte[64]);
        assertTrue(result.policy.ready());
        assertArrayEquals(commands.key, result.publicKey);
        assertEquals(Arrays.asList("status", "secure", "verify", "import", "status", "derive"), commands.actions);
        assertEquals(1, commands.verifies);
    }

    @Test
    public void refusesSeededCardsBeforeSetupOrAuthentication() throws Exception {
        Commands commands = new Commands();
        byte[] pin = "123456".getBytes("US-ASCII");
        byte[] puk = "abcdef0123456789".getBytes("US-ASCII");
        byte[] seed = new byte[64];
        Arrays.fill(seed, (byte) 7);
        assertThrows(IllegalStateException.class, () -> CardSession.setup(commands, channel(), pin, puk, seed));
        assertEquals(Arrays.asList("status"), commands.actions);
        assertEquals(0, commands.verifies);
        assertArrayEquals(new byte[6], pin);
        assertArrayEquals(new byte[16], puk);
        assertArrayEquals(new byte[64], seed);
    }

    @Test
    public void invalidSetupInputsNeverReachTheCard() throws Exception {
        Commands commands = new Commands();
        byte[] pin = "123456".getBytes("US-ASCII");
        byte[] puk = "not-hex-recovery".getBytes("US-ASCII");
        byte[] seed = new byte[64];
        assertThrows(IllegalArgumentException.class, () -> CardSession.setup(commands, channel(), pin, puk, seed));
        assertTrue(commands.actions.isEmpty());
        assertArrayEquals(new byte[6], pin);
        assertArrayEquals(new byte[16], puk);
    }

    @Test
    public void officialSetupUsesExplicitRecoveryCodeAndRetryBudgets() throws Exception {
        AtomicReference<byte[]> setupData = new AtomicReference<>();
        CardChannel scripted = new CardChannel() {
            public boolean isConnected() { return true; }
            public APDUResponse send(APDUCommand command) {
                if (command.getIns() == 0x3c) return new APDUResponse(initializedStatus(), (byte) 0x90, (byte) 0);
                if (command.getIns() == 0x2a) setupData.set(command.getData().clone());
                return new APDUResponse(new byte[] {(byte) 0x90, 0});
            }
        };
        BoundedCardChannel channel = new BoundedCardChannel(scripted, () -> {});
        channel.begin();
        CardSession.Commands commands = CardSession.official(channel);
        commands.select();
        byte[] pin = "123456".getBytes("US-ASCII");
        byte[] puk = "abcdef0123456789".getBytes("US-ASCII");
        commands.setup(pin, puk);
        byte[] data = setupData.get();
        int start = 1 + data[0];
        assertEquals(5, data[start++]);
        assertEquals(3, data[start++]);
        assertEquals(6, data[start++]);
        assertArrayEquals(pin, Arrays.copyOfRange(data, start, start + 6));
        start += 6;
        assertEquals(16, data[start++]);
        assertArrayEquals(puk, Arrays.copyOfRange(data, start, start + 16));
        start += 16;
        assertEquals(1, data[start++]);
        assertEquals(1, data[start++]);
        assertEquals(16, data[start++]);
        assertEquals(16, data[start + 16]);
        commands.disconnect();
    }

    @Test
    public void failedSetupAuthenticationNeverImportsOrRetriesThePin() throws Exception {
        Commands commands = new Commands();
        commands.status[9] = 0;
        commands.status[11] = 1;
        commands.wrongPin = true;
        byte[] pin = "123456".getBytes("US-ASCII");
        byte[] seed = new byte[64];
        Arrays.fill(seed, (byte) 7);
        assertThrows(IOException.class, () -> CardSession.setup(commands, channel(), pin, null, seed));
        assertEquals(Arrays.asList("status", "secure", "verify"), commands.actions);
        assertEquals(1, commands.verifies);
        assertArrayEquals(new byte[6], pin);
        assertArrayEquals(new byte[64], seed);
    }

    @Test
    public void setupRejectsAMalformedDerivedBindingWithoutAnotherPinAttempt() throws Exception {
        Commands commands = new Commands();
        commands.status[9] = 0;
        commands.status[11] = 1;
        commands.key[0] = 1;
        byte[] pin = "123456".getBytes("US-ASCII");
        byte[] seed = new byte[64];
        Arrays.fill(seed, (byte) 7);
        assertThrows(IllegalStateException.class, () -> CardSession.setup(commands, channel(), pin, null, seed));
        assertEquals(1, commands.verifies);
        assertEquals(1, commands.status[9]);
        assertArrayEquals(new byte[6], pin);
        assertArrayEquals(new byte[64], seed);
    }

    @Test
    public void idleStatusDoesNotDeriveAuthenticateOrTweakAndLossClosesSession() throws Exception {
        Commands commands = new Commands();
        Channel delegate = new Channel();
        BoundedCardChannel channel = new BoundedCardChannel(delegate, () -> delegate.connected = false);
        CardSession current = new CardSession(commands, channel, "123456".getBytes("US-ASCII"));
        commands.actions.clear();
        current.status();
        assertEquals(Arrays.asList("status"), commands.actions);
        delegate.connected = false;
        assertThrows(IllegalStateException.class, current::status);
        assertEquals(Arrays.asList("status", "disconnect"), commands.actions);
        assertThrows(IllegalStateException.class, () -> current.signSchnorr(new byte[32], null));
        assertEquals(1, commands.verifies);
    }

    @Test
    public void idleStatusCannotInterleaveWithDeriveTweakSign() throws Exception {
        Commands commands = new Commands();
        commands.signingStarted = new CountDownLatch(1);
        commands.finishSigning = new CountDownLatch(1);
        AtomicReference<Throwable> failure = new AtomicReference<>();
        try (CardSession current = session(commands)) {
            commands.actions.clear();
            Thread signing = new Thread(() -> {
                try { current.signSchnorr(new byte[32], null); } catch (Throwable error) { failure.set(error); }
            });
            Thread presence = new Thread(() -> {
                try { current.status(); } catch (Throwable error) { failure.set(error); }
            });
            signing.start();
            assertTrue(commands.signingStarted.await(5, TimeUnit.SECONDS));
            presence.start();
            commands.finishSigning.countDown();
            signing.join(5_000);
            presence.join(5_000);
            assertFalse(signing.isAlive());
            assertFalse(presence.isAlive());
            assertNull(failure.get());
            assertEquals(Arrays.asList("status", "derive", "tweak:true:0", "schnorr", "status"), commands.actions);
            assertEquals(1, commands.verifies);
        }
    }

    @Test
    public void wrongPinIsNeverRetried() throws Exception {
        Commands commands = new Commands();
        commands.wrongPin = true;
        byte[] pin = "123456".getBytes("US-ASCII");
        assertThrows(IOException.class, () -> new CardSession(commands, channel(), pin));
        assertEquals(1, commands.verifies);
        assertArrayEquals(new byte[6], pin);
        assertTrue(commands.actions.contains("disconnect"));
    }

    @Test
    public void signingDerivesThenTweaksAndSignsInTheSameSession() throws Exception {
        Commands commands = new Commands();
        try (CardSession current = session(commands)) {
            commands.actions.clear();
            current.signSchnorr(new byte[32], null);
            assertEquals(Arrays.asList("status", "derive", "tweak:true:0", "schnorr"), commands.actions);
            commands.actions.clear();
            current.signSchnorr(new byte[32], new byte[0]);
            assertEquals(Arrays.asList("status", "derive", "tweak:false:0", "schnorr"), commands.actions);
            commands.actions.clear();
            current.signSchnorr(new byte[32], new byte[32]);
            assertEquals(Arrays.asList("status", "derive", "tweak:false:32", "schnorr"), commands.actions);
            assertEquals(1, commands.verifies);
        }
    }

    @Test
    public void ecdsaDerivesWithoutTaprootTweak() throws Exception {
        Commands commands = new Commands();
        try (CardSession current = session(commands)) {
            commands.actions.clear();
            current.signEcdsa(new byte[32]);
            assertEquals(Arrays.asList("status", "derive", "ecdsa"), commands.actions);
        }
    }

    @Test
    public void changedCardCannotSignAndInvalidatesTheSession() throws Exception {
        Commands commands = new Commands();
        CardSession current = session(commands);
        commands.key[32] = 2;
        commands.actions.clear();
        assertThrows(IllegalStateException.class, () -> current.signSchnorr(new byte[32], null));
        assertFalse(commands.actions.contains("schnorr"));
        assertTrue(commands.actions.contains("disconnect"));
        assertThrows(IllegalStateException.class, () -> current.publicKey());
        assertEquals(1, commands.verifies);
    }

    @Test
    public void malformedHashesAndTweaksDoNotReachTheCard() throws Exception {
        Commands commands = new Commands();
        try (CardSession current = session(commands)) {
            commands.actions.clear();
            assertThrows(IllegalArgumentException.class, () -> current.signSchnorr(new byte[31], null));
            assertThrows(IllegalArgumentException.class, () -> current.signSchnorr(new byte[32], new byte[31]));
            assertThrows(IllegalArgumentException.class, () -> current.signEcdsa(new byte[33]));
            assertTrue(commands.actions.isEmpty());
        }
    }

    @Test
    public void returnedPublicKeyCannotMutateThePinnedBinding() throws Exception {
        Commands commands = new Commands();
        try (CardSession current = session(commands)) {
            byte[] key = current.publicKey();
            key[32] = 99;
            assertEquals(1, current.publicKey()[32]);
        }
    }

    @Test
    public void libraryRetryLoopsCannotExceedTheOperationApduBudget() throws Exception {
        Channel delegate = new Channel();
        BoundedCardChannel channel = new BoundedCardChannel(delegate, () -> delegate.connected = false);
        channel.begin();
        APDUCommand command = new APDUCommand(0xb0, 0x3c, 0, 0, new byte[0]);
        for (int i = 0; i < 48; i++) channel.send(command);
        assertThrows(IOException.class, () -> channel.send(command));
        assertEquals(48, delegate.sends);
        assertFalse(channel.isConnected());
    }

    @Test
    public void officialConnectorCannotReuseThePinWhenAuthenticationIsLost() throws Exception {
        int[] verifies = {0};
        CardChannel scripted = new CardChannel() {
            public boolean isConnected() { return true; }
            public APDUResponse send(APDUCommand command) throws IOException {
                int instruction = command.serialize()[1] & 0xff;
                if (instruction == 0x3c) {
                    return new APDUResponse(initializedStatus(), (byte) 0x90, (byte) 0);
                }
                if (instruction == 0x42) {
                    verifies[0]++;
                    return new APDUResponse(new byte[] {(byte) 0x90, 0});
                }
                if (instruction == 0xa4) return new APDUResponse(new byte[] {(byte) 0x90, 0});
                return new APDUResponse(new byte[] {(byte) 0x9c, 6});
            }
        };
        BoundedCardChannel channel = new BoundedCardChannel(scripted, () -> {});
        channel.begin();
        CardSession.Commands commands = CardSession.official(channel);
        commands.select();
        commands.verifyPin("123456".getBytes("US-ASCII"));
        commands.clearPin();
        assertThrows(Exception.class, () -> commands.derive());
        assertEquals(1, verifies[0]);
        commands.disconnect();
    }
}
