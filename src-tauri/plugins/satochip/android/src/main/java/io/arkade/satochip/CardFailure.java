package io.arkade.satochip;

import java.io.IOException;
import java.util.Locale;
import org.satochip.io.APDUException;
import org.satochip.io.BlockedPINException;
import org.satochip.io.WrongPINException;
import org.satochip.io.WrongPINLegacyException;

final class CardFailure extends IOException {
    enum Phase { SELECT, STATUS, SECURE_CHANNEL, VERIFY_PIN, DERIVE_KEY }

    private final Phase phase;

    private CardFailure(Phase phase, Exception cause) {
        super("Satochip operation failed during " + phase, cause);
        this.phase = phase;
    }

    static Exception at(Phase phase, Exception error) {
        if (error instanceof CardFailure || error instanceof IllegalArgumentException || error instanceof IllegalStateException) return error;
        return new CardFailure(phase, error);
    }

    static String message(Exception error) {
        if (error instanceof CardFailure) {
            CardFailure failure = (CardFailure) error;
            String label = " [" + failure.phase + "]";
            Throwable cause = failure.getCause();
            if (failure.phase == Phase.VERIFY_PIN) {
                String rejected = pinMessage(cause);
                if (rejected != null) return rejected + label;
                return "PIN verification could not be confirmed" + status(cause)
                    + ". Keep the card in place and connect again; no automatic PIN retry was attempted." + label;
            }
            if (failure.phase == Phase.DERIVE_KEY) {
                return "The PIN was accepted, but reading the card public key failed" + status(cause)
                    + ". Connect the card again; no automatic PIN retry was attempted." + label;
            }
            String operation = failure.phase == Phase.SELECT ? "Card selection"
                : failure.phase == Phase.STATUS ? "Reading card status" : "Secure-channel setup";
            return operation + " failed" + status(cause)
                + ". The PIN was not checked. Lift the card, then tap it again to reconnect." + label;
        }
        String rejected = pinMessage(error);
        if (rejected != null) return rejected;
        if (error instanceof IllegalArgumentException || error instanceof IllegalStateException) {
            return error.getMessage() == null ? "Card operation failed. Connect again." : error.getMessage();
        }
        return "Card communication could not be completed" + status(error)
            + ". Connect the card again; no automatic PIN retry was attempted.";
    }

    private static String pinMessage(Throwable error) {
        if (error instanceof BlockedPINException) return "The card PIN is blocked. This app will not retry it.";
        if (error instanceof WrongPINException) {
            int remaining = ((WrongPINException) error).getRetryAttempts();
            if (remaining == 0) return "The card PIN is blocked. This app will not retry it.";
            String attempts = remaining > 0 && remaining <= 15 ? " (" + remaining + (remaining == 1 ? " attempt remaining)" : " attempts remaining)") : "";
            return "The card rejected the PIN" + attempts + ". No automatic PIN retry was attempted.";
        }
        if (error instanceof WrongPINLegacyException) return "The card rejected the PIN. No automatic PIN retry was attempted.";
        if (error instanceof APDUException) {
            int word = ((APDUException) error).sw;
            if (word == 0x6983 || word == 0x9c0c) return "The card PIN is blocked. This app will not retry it.";
            if ((word & 0xfff0) == 0x63c0) return pinMessage(new WrongPINException(word & 15));
            if (word == 0x9c02) return "The card rejected the PIN. No automatic PIN retry was attempted.";
        }
        return null;
    }

    private static String status(Throwable error) {
        for (int depth = 0; error != null && depth < 8; depth++, error = error.getCause()) {
            if (error instanceof APDUException) {
                int word = ((APDUException) error).sw;
                if (word > 0 && word <= 0xffff) return String.format(Locale.ROOT, " (card status 0x%04X)", word);
            }
        }
        return "";
    }
}
