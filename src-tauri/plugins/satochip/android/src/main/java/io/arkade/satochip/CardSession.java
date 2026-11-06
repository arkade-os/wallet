package io.arkade.satochip;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.io.IOException;
import org.satochip.client.SatochipCommandSet;
import org.satochip.io.APDUCommand;
import org.satochip.io.APDUException;
import org.satochip.io.APDUResponse;
import org.satochip.io.CardChannel;

final class CardSession implements AutoCloseable {
    static final String PATH = "m/86'/1'/0'/0/0";

    interface Commands {
        void select() throws Exception;
        byte[] status() throws Exception;
        void verifyPin(byte[] pin) throws Exception;
        void clearPin();
        void secureChannel() throws Exception;
        void setup(byte[] pin, byte[] puk) throws Exception;
        void importSeed(byte[] seed) throws Exception;
        byte[] derive() throws Exception;
        void tweak(byte[] tweak, boolean bypass) throws Exception;
        byte[] schnorr(byte[] hash) throws Exception;
        byte[] ecdsa(byte[] hash) throws Exception;
        void disconnect();
    }

    private final Commands commands;
    private final BoundedCardChannel channel;
    private byte[] publicKey;
    private boolean closed;

    static final class SetupResult {
        final CardPolicy policy;
        final byte[] publicKey;

        SetupResult(CardPolicy policy, byte[] publicKey) {
            this.policy = policy;
            this.publicKey = publicKey;
        }
    }

    static CardPolicy inspect(Commands commands, BoundedCardChannel channel) throws Exception {
        CardFailure.Phase phase = CardFailure.Phase.SELECT;
        try {
            channel.begin();
            commands.select();
            phase = CardFailure.Phase.STATUS;
            return readPolicy(commands);
        } catch (Exception error) {
            throw CardFailure.at(phase, error);
        }
    }

    static CardPolicy readPolicy(Commands commands) throws Exception {
        CardPolicy policy = new CardPolicy(commands.status());
        policy.requireCompatible();
        return policy;
    }

    static SetupResult setup(Commands commands, BoundedCardChannel channel, byte[] pin, byte[] puk, byte[] seed) throws Exception {
        try {
            requirePin(pin);
            if (seed == null || seed.length != 64) throw new IllegalArgumentException("A 64-byte BIP39 seed is required.");
            if (puk != null) {
                if (puk.length != 16) throw new IllegalArgumentException("Use a 16-character hexadecimal PIN recovery code.");
                for (byte digit : puk) {
                    if (!(digit >= '0' && digit <= '9') && !(digit >= 'a' && digit <= 'f') && !(digit >= 'A' && digit <= 'F')) {
                        throw new IllegalArgumentException("Use a 16-character hexadecimal PIN recovery code.");
                    }
                }
            }
            channel.begin();
            CardPolicy policy = readPolicy(commands);
            if (policy.seeded) throw new IllegalStateException("This card already has a wallet; its seed will not be replaced.");
            if (!policy.needsSecureChannel) throw new IllegalStateException("Card setup requires a secure channel.");
            if (!policy.setupDone && puk == null) throw new IllegalArgumentException("Save a PIN recovery code before setting up the card.");
            commands.secureChannel();
            if (!policy.setupDone) commands.setup(pin, puk);
            commands.verifyPin(pin);
            commands.clearPin();
            commands.importSeed(seed);
            CardPolicy initialized = readPolicy(commands);
            initialized.requireReady();
            return new SetupResult(initialized, checkedKey(commands.derive()));
        } finally {
            commands.clearPin();
            if (pin != null) Arrays.fill(pin, (byte) 0);
            if (puk != null) Arrays.fill(puk, (byte) 0);
            if (seed != null) Arrays.fill(seed, (byte) 0);
        }
    }

    CardSession(Commands commands, BoundedCardChannel channel, byte[] pin) throws Exception {
        this.commands = commands;
        this.channel = channel;
        CardFailure.Phase phase = CardFailure.Phase.SELECT;
        try {
            requirePin(pin);
            channel.begin();
            commands.select();
            phase = CardFailure.Phase.STATUS;
            CardPolicy policy = new CardPolicy(commands.status());
            policy.requireReady();
            if (policy.needsSecureChannel) {
                phase = CardFailure.Phase.SECURE_CHANNEL;
                commands.secureChannel();
            }
            phase = CardFailure.Phase.VERIFY_PIN;
            commands.verifyPin(pin);
            commands.clearPin();
            phase = CardFailure.Phase.DERIVE_KEY;
            publicKey = checkedKey(commands.derive());
        } catch (Exception error) {
            close();
            throw CardFailure.at(phase, error);
        } finally {
            commands.clearPin();
            if (pin != null) Arrays.fill(pin, (byte) 0);
        }
    }

    private static final class PinGuardChannel implements CardChannel {
        private final BoundedCardChannel channel;
        private boolean verifying;
        private int sent;
        private int verificationStatus;

        PinGuardChannel(BoundedCardChannel channel) { this.channel = channel; }
        void beginVerification() { verifying = true; sent = 0; verificationStatus = -1; }
        void endVerification() { verifying = false; }
        public boolean isConnected() { return channel.isConnected(); }
        public APDUResponse send(APDUCommand command) throws IOException {
            int instruction = command.getIns();
            if (verifying && (instruction == 0x42 || instruction == 0x82) && sent++ != 0) {
                throw new IOException("Automatic PIN retry was blocked.");
            }
            APDUResponse response = channel.send(command);
            if (verifying && (instruction == 0x42 || instruction == 0x82)) verificationStatus = response.getSw();
            if (instruction == 0x81 && !response.isOK()) {
                throw new IOException("Secure-channel setup was rejected.", new APDUException(response.getSw(), "Secure-channel setup failed"));
            }
            return response;
        }
    }

    static Commands official(BoundedCardChannel channel) {
        PinGuardChannel guarded = new PinGuardChannel(channel);
        SatochipCommandSet commandSet = new SatochipCommandSet(guarded) {
            @Override
            public void setPin0(byte[] pin) {
                // Setup must not retain an extra copy of the PIN.
            }
            // Authentication expiry must not consume another PIN attempt without user action.
            @Override
            public APDUResponse cardVerifyPIN() {
                throw new IllegalStateException("Authentication expired. Connect the card again; PIN retry is disabled.");
            }
        };
        commandSet.setLoggerLevel("off");
        return new Commands() {
            private byte[] verifiedPin;
            public void select() throws Exception { commandSet.cardSelect("satochip").checkOK(); }
            public byte[] status() throws Exception { return commandSet.cardGetStatus().checkOK().getData(); }
            public void verifyPin(byte[] pin) throws Exception {
                verifiedPin = pin;
                guarded.beginVerification();
                try {
                    commandSet.cardVerifyPIN(pin).checkOK();
                } catch (Exception error) {
                    int status = guarded.verificationStatus;
                    if (status >= 0 && status != 0x9000 && (status & 0xfff0) != 0x63c0
                        && status != 0x9c02 && status != 0x9c0c && status != 0x6983) {
                        throw new APDUException(status, "PIN verification could not be confirmed.");
                    }
                    throw error;
                } finally {
                    guarded.endVerification();
                }
            }
            public void clearPin() {
                if (verifiedPin != null) Arrays.fill(verifiedPin, (byte) 0);
                verifiedPin = null;
            }
            public void secureChannel() throws Exception { commandSet.cardInitiateSecureChannel(); }
            public void setup(byte[] pin, byte[] puk) throws Exception {
                byte[] secondaryPin = new byte[16];
                byte[] secondaryPuk = new byte[16];
                SecureRandom random = new SecureRandom();
                random.nextBytes(secondaryPin);
                random.nextBytes(secondaryPuk);
                try {
                    commandSet.cardSetup((byte) 5, (byte) 3, pin, puk, (byte) 1, (byte) 1, secondaryPin, secondaryPuk).checkOK();
                } finally {
                    Arrays.fill(secondaryPin, (byte) 0);
                    Arrays.fill(secondaryPuk, (byte) 0);
                }
            }
            public void importSeed(byte[] seed) throws Exception { commandSet.cardBip32ImportSeed(seed).checkOK(); }
            public byte[] derive() throws Exception {
                byte[] key = commandSet.cardBip32GetExtendedKey(PATH, null, null)[0];
                return commandSet.getParser().compressPubKey(key);
            }
            public void tweak(byte[] tweak, boolean bypass) throws Exception {
                commandSet.cardTaprootTweakPrivateKey(0xff, tweak, bypass);
            }
            public byte[] schnorr(byte[] hash) throws Exception { return commandSet.cardSignSchnorrHash(hash, null); }
            public byte[] ecdsa(byte[] hash) throws Exception {
                return commandSet.cardSignTransactionHash((byte) 0xff, hash, null).checkOK().getData();
            }
            public void disconnect() { commandSet.cardDisconnect(); }
        };
    }

    synchronized CardPolicy status() throws Exception {
        try {
            requireConnected();
            channel.begin();
            CardPolicy result = new CardPolicy(commands.status());
            result.requireReady();
            return result;
        } catch (Exception error) {
            close();
            throw error;
        }
    }

    synchronized byte[] publicKey() throws Exception {
        try {
            beginSigning();
            return publicKey.clone();
        } catch (Exception error) {
            close();
            throw CardFailure.at(CardFailure.Phase.DERIVE_KEY, error);
        }
    }

    synchronized byte[] signSchnorr(byte[] hash, byte[] tweak) throws Exception {
        requireHash(hash);
        if (tweak != null && tweak.length != 0 && tweak.length != 32) {
            throw new IllegalArgumentException("The Taproot tweak must be empty, 32 bytes, or null.");
        }
        try {
            beginSigning();
            commands.tweak(tweak == null ? new byte[0] : tweak.clone(), tweak == null);
            byte[] signature = commands.schnorr(hash.clone());
            if (signature.length != 64) throw new IllegalStateException("The card returned an invalid Schnorr signature.");
            return signature;
        } catch (Exception error) {
            close();
            throw error;
        }
    }

    synchronized byte[] signEcdsa(byte[] hash) throws Exception {
        requireHash(hash);
        try {
            beginSigning();
            byte[] signature = commands.ecdsa(hash.clone());
            if (signature.length < 8 || signature.length > 72 || signature[0] != 0x30) {
                throw new IllegalStateException("The card returned an invalid ECDSA signature.");
            }
            return signature;
        } catch (Exception error) {
            close();
            throw error;
        }
    }

    private void beginSigning() throws Exception {
        requireConnected();
        channel.begin();
        new CardPolicy(commands.status()).requireReady();
        byte[] current = checkedKey(commands.derive());
        if (!MessageDigest.isEqual(publicKey, current)) {
            throw new IllegalStateException("The connected card changed. Lock the wallet and connect the original card.");
        }
    }

    private void requireConnected() {
        if (closed || !channel.isConnected()) {
            throw new IllegalStateException("Hold your Satochip against the phone and connect it again.");
        }
    }

    static void requireHash(byte[] hash) {
        if (hash == null || hash.length != 32) throw new IllegalArgumentException("A 32-byte hash is required.");
    }

    static void requirePin(byte[] pin) {
        if (pin == null || pin.length < 6 || pin.length > 16) throw new IllegalArgumentException("Use a 6–16 digit PIN.");
        for (byte digit : pin) {
            if (digit < '0' || digit > '9') throw new IllegalArgumentException("Use a 6–16 digit PIN.");
        }
    }

    private static byte[] checkedKey(byte[] key) {
        if (key == null || key.length != 33 || (key[0] != 2 && key[0] != 3)) {
            throw new IllegalStateException("The card returned an invalid compressed public key.");
        }
        return key.clone();
    }

    @Override
    public synchronized void close() {
        if (!closed) {
            closed = true;
            commands.clearPin();
            commands.disconnect();
            channel.close();
            if (publicKey != null) Arrays.fill(publicKey, (byte) 0);
        }
    }
}
