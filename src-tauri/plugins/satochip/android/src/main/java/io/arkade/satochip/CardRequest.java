package io.arkade.satochip;

import java.util.Arrays;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.BooleanSupplier;

class CardRequest {
    final long generation;
    final boolean inspect;
    final boolean setup;
    final AtomicBoolean claimed = new AtomicBoolean(false);
    private boolean finished;
    private Secrets secrets;
    private BoundedCardChannel channel;

    CardRequest(long generation, boolean inspect, byte[] pin, byte[] puk, byte[] seed) {
        this.generation = generation;
        this.inspect = inspect;
        this.setup = seed != null;
        this.secrets = new Secrets(pin, puk, seed);
    }

    synchronized boolean isFinished() { return finished; }

    synchronized boolean attachChannel(BoundedCardChannel next) {
        if (finished) { next.close(); return false; }
        channel = next;
        return true;
    }

    synchronized boolean replacePin(byte[] pin) {
        if (finished || secrets == null) { Arrays.fill(pin, (byte) 0); return false; }
        Arrays.fill(secrets.pin, (byte) 0);
        secrets = new Secrets(pin, secrets.puk, secrets.seed);
        return true;
    }

    synchronized Secrets takeSecrets() {
        if (finished || secrets == null) throw new IllegalStateException("Card connection cancelled.");
        Secrets taken = secrets;
        secrets = null;
        return taken;
    }

    synchronized boolean finish(BooleanSupplier current) {
        if (finished || !current.getAsBoolean()) return false;
        finished = true;
        clearQueuedSecrets();
        return true;
    }

    synchronized boolean cancel() {
        if (finished) return false;
        finished = true;
        clearQueuedSecrets();
        if (channel != null) channel.close();
        return true;
    }

    private void clearQueuedSecrets() {
        if (secrets != null) secrets.close();
        secrets = null;
    }

    static final class Secrets implements AutoCloseable {
        final byte[] pin;
        final byte[] puk;
        final byte[] seed;

        Secrets(byte[] pin, byte[] puk, byte[] seed) {
            this.pin = pin;
            this.puk = puk;
            this.seed = seed;
        }

        @Override public void close() {
            Arrays.fill(pin, (byte) 0);
            if (puk != null) Arrays.fill(puk, (byte) 0);
            if (seed != null) Arrays.fill(seed, (byte) 0);
        }
    }
}
