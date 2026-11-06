package io.arkade.satochip;

final class CardPolicy {
    final String version;
    final boolean seeded;
    final boolean setupDone;
    final boolean needs2FA;
    final boolean schnorrEnabled;
    final boolean untweakedSchnorrEnabled;
    final boolean supported;
    final boolean needsSecureChannel;

    CardPolicy(byte[] status) {
        if (status == null || status.length < 16) {
            throw new IllegalArgumentException("The card did not return a complete Satochip status.");
        }
        int[] versionParts = new int[4];
        for (int i = 0; i < 4; i++) versionParts[i] = status[i] & 0xff;
        version = versionParts[0] + "." + versionParts[1] + "-" + versionParts[2] + "." + versionParts[3];
        int[] minimum = {0, 16, 0, 1};
        boolean current = true;
        for (int i = 0; i < minimum.length; i++) {
            if (versionParts[i] != minimum[i]) {
                current = versionParts[i] > minimum[i];
                break;
            }
        }
        supported = current;
        seeded = status[9] != 0;
        setupDone = status[10] != 0;
        needs2FA = status[8] != 0;
        schnorrEnabled = status[13] == 0;
        untweakedSchnorrEnabled = status[14] == 0;
        needsSecureChannel = status[11] != 0;
    }

    boolean ready() {
        return supported && seeded && setupDone && !needs2FA && schnorrEnabled && untweakedSchnorrEnabled;
    }

    void requireReady() {
        requireCompatible();
        if (!seeded || !setupDone) {
            throw new IllegalStateException("Set up this empty Satochip before connecting.");
        }
    }

    void requireCompatible() {
        if (!supported) throw new IllegalStateException("Satochip applet 0.16-0.1 or newer is required.");
        if (needs2FA) throw new IllegalStateException("This host does not support cards with 2FA enabled.");
        if (!schnorrEnabled || !untweakedSchnorrEnabled) {
            throw new IllegalStateException("Schnorr and untweaked Schnorr signing must be enabled on the card.");
        }
    }
}
