package io.arkade.satochip;

import static org.junit.Assert.*;
import java.util.Arrays;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.Test;
import org.satochip.io.APDUCommand;
import org.satochip.io.APDUResponse;
import org.satochip.io.CardChannel;

public class CardRequestTest {
    private BoundedCardChannel channel(AtomicBoolean closed) {
        return new BoundedCardChannel(new CardChannel() {
            public boolean isConnected() { return !closed.get(); }
            public APDUResponse send(APDUCommand command) { return new APDUResponse(new byte[] {(byte) 0x90, 0}); }
        }, () -> closed.set(true));
    }

    @Test public void cancellingQueuedOrClaimedSetupWipesEverySecretBeforeExecution() {
        for (boolean claimed : new boolean[] {false, true}) {
            byte[] pin = new byte[6];
            byte[] puk = new byte[16];
            byte[] seed = new byte[64];
            Arrays.fill(pin, (byte) 7);
            Arrays.fill(puk, (byte) 8);
            Arrays.fill(seed, (byte) 9);
            CardRequest request = new CardRequest(1, false, pin, puk, seed);
            request.claimed.set(claimed);
            assertTrue(request.setup);
            assertTrue(request.cancel());
            assertFalse(request.cancel());
            assertThrows(IllegalStateException.class, request::takeSecrets);
            assertArrayEquals(new byte[6], pin);
            assertArrayEquals(new byte[16], puk);
            assertArrayEquals(new byte[64], seed);
            assertFalse(request.finish(() -> true));
        }
    }

    @Test public void cancellationClosesOwnedTransportAndWorkerClearsTakenSecrets() {
        byte[] pin = new byte[6];
        byte[] puk = new byte[16];
        byte[] seed = new byte[64];
        Arrays.fill(seed, (byte) 7);
        CardRequest request = new CardRequest(1, false, pin, puk, seed);
        AtomicBoolean closed = new AtomicBoolean(false);
        BoundedCardChannel transport = channel(closed);
        assertTrue(request.attachChannel(transport));
        try (CardRequest.Secrets taken = request.takeSecrets()) {
            assertSame(seed, taken.seed);
            assertTrue(request.cancel());
            assertTrue(closed.get());
            assertFalse(transport.isConnected());
            assertFalse(request.finish(() -> true));
            assertEquals(7, seed[0]);
        }
        assertArrayEquals(new byte[6], pin);
        assertArrayEquals(new byte[16], puk);
        assertArrayEquals(new byte[64], seed);
    }

    @Test public void channelAcquiredAfterCancellationIsClosedWithoutBeingUsed() {
        CardRequest request = new CardRequest(1, true, new byte[0], null, null);
        request.cancel();
        AtomicBoolean closed = new AtomicBoolean(false);
        assertFalse(request.attachChannel(channel(closed)));
        assertTrue(closed.get());
    }

    @Test public void latePinCallbackCannotRetainANewPinAfterCancellation() {
        CardRequest request = new CardRequest(1, false, new byte[0], null, null);
        request.cancel();
        byte[] pin = new byte[6];
        Arrays.fill(pin, (byte) 7);
        assertFalse(request.replacePin(pin));
        assertArrayEquals(new byte[6], pin);
    }

    @Test public void staleGenerationCannotPublishAndCannotFinishANewerRequest() {
        AtomicLong generation = new AtomicLong(1);
        CardRequest old = new CardRequest(generation.get(), false, new byte[6], null, new byte[64]);
        try (CardRequest.Secrets taken = old.takeSecrets()) {
            generation.incrementAndGet();
            CardRequest current = new CardRequest(generation.get(), false, new byte[6], null, null);
            assertFalse(old.finish(() -> generation.get() == old.generation));
            assertTrue(old.cancel());
            assertTrue(current.finish(() -> generation.get() == current.generation));
            assertFalse(current.finish(() -> true));
            assertFalse(current.cancel());
        }
    }
}
