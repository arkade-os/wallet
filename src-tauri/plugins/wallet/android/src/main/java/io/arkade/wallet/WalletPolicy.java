package io.arkade.wallet;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

public final class WalletPolicy {
    public static final int SECRET_LIMIT = 2560;

    public static void requireSecretKey(String key) {
        if (!"encrypted_mnemonic".equals(key) && !"encrypted_private_key".equals(key)) {
            throw new IllegalArgumentException("Unsupported wallet secret");
        }
    }

    public static void requireSecretValue(String value) {
        if (value == null || value.isEmpty() || value.getBytes(StandardCharsets.UTF_8).length > SECRET_LIMIT) {
            throw new IllegalArgumentException("Invalid wallet secret size");
        }
    }

    public static boolean trustedOrigin(String raw, boolean debug) {
        try {
            URI url = new URI(raw);
            if (url.getRawUserInfo() != null) return false;
            String scheme = url.getScheme();
            String host = url.getHost();
            boolean local = url.getPort() == -1
                && (("tauri".equals(scheme) && "localhost".equals(host))
                    || (("http".equals(scheme) || "https".equals(scheme)) && "tauri.localhost".equals(host)));
            return local || (debug && "http".equals(scheme) && url.getPort() == 3002
                && ("localhost".equals(host) || "127.0.0.1".equals(host)));
        } catch (Exception ignored) {
            return false;
        }
    }

    public static boolean allowedIntent(String raw) {
        if (raw == null || raw.isEmpty() || raw.length() > 6000 || raw.chars().anyMatch(c -> c <= 32 || c == 127)) return false;
        try {
            URI uri = new URI(raw);
            String scheme = uri.getScheme();
            if (scheme == null || uri.getRawUserInfo() != null) return false;
            scheme = scheme.toLowerCase(Locale.ROOT);
            String content = uri.getSchemeSpecificPart();
            if (content == null || content.isEmpty() || content.chars().anyMatch(c -> c < 32 || c == 127)) return false;
            if ("bitcoin".equals(scheme) || "lightning".equals(scheme)) return uri.isOpaque();
            if ("arkade".equals(scheme) || "web+arkade".equals(scheme)) {
                return "send".equals(uri.getHost()) || "connect".equals(uri.getHost());
            }
            return "https".equals(scheme) && "arkade.money".equalsIgnoreCase(uri.getHost())
                && ("".equals(uri.getRawPath()) || "/".equals(uri.getRawPath()))
                && (uri.getPort() == -1 || uri.getPort() == 443);
        } catch (Exception ignored) {
            return false;
        }
    }

    private WalletPolicy() {}
}
