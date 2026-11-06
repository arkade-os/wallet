package io.arkade.satochip;

import static org.junit.Assert.*;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.Test;

public class ReaderModeLeaseTest {
    @Test public void queuedCloseCannotDisableNewPendingReader() {
        ReaderModeLease<String> lease = new ReaderModeLease<>();
        Object oldRequest = new Object();
        Object newRequest = new Object();
        List<String> actions = new ArrayList<>();
        lease.claim(oldRequest);
        Runnable close = () -> lease.release(oldRequest, () -> true, tag -> actions.add("disable"));
        lease.claim(newRequest);
        lease.runIfOwned(newRequest, () -> true, () -> actions.add("enable"));
        close.run();
        assertEquals(Arrays.asList("enable"), actions);
        assertSame(newRequest, lease.owner());
    }

    @Test public void queuedCancelCannotDisableCompletedInspectionOrConnection() {
        for (String state : Arrays.asList("inspection", "authenticated")) {
            ReaderModeLease<String> lease = new ReaderModeLease<>();
            Object cancelled = new Object();
            Object completed = new Object();
            lease.claim(cancelled);
            Runnable cancel = () -> lease.release(cancelled, () -> true, tag -> fail(state));
            lease.claim(completed);
            lease.recordTag(completed, state);
            cancel.run();
            assertSame(completed, lease.owner());
        }
    }

    @Test public void staleEnableAndTagCallbackCannotReplaceNewReader() {
        ReaderModeLease<String> lease = new ReaderModeLease<>();
        Object oldRequest = new Object();
        Object newRequest = new Object();
        lease.claim(oldRequest);
        lease.claim(newRequest);
        assertTrue(lease.recordTag(newRequest, "new tag"));
        assertFalse(lease.runIfOwned(oldRequest, () -> true, () -> fail("stale reader enabled")));
        assertFalse(lease.recordTag(oldRequest, "old tag"));
        lease.release(newRequest, () -> true, tag -> assertEquals("new tag", tag));
    }

    @Test public void pinHandoffKeepsReaderAndLastTagUntilFreshDiscovery() {
        ReaderModeLease<String> lease = new ReaderModeLease<>();
        Object inspected = new Object();
        Object connect = new Object();
        lease.claim(inspected);
        lease.recordTag(inspected, "inspection tag");
        lease.claim(connect);
        assertFalse(lease.release(inspected, () -> true, tag -> fail("handoff disabled reader")));
        assertTrue(lease.recordTag(connect, "fresh tag"));
        lease.release(connect, () -> true, tag -> assertEquals("fresh tag", tag));
    }

    @Test public void cancellingBeforeRetapStillReleasesTheHeldInspectionTag() {
        ReaderModeLease<String> lease = new ReaderModeLease<>();
        Object inspected = new Object();
        Object connect = new Object();
        lease.claim(inspected);
        lease.recordTag(inspected, "held tag");
        lease.claim(connect);
        lease.release(connect, () -> true, tag -> assertEquals("held tag", tag));
    }

    @Test public void terminalReleaseRunsOnceWithOwnedTag() {
        ReaderModeLease<String> lease = new ReaderModeLease<>();
        Object request = new Object();
        List<String> actions = new ArrayList<>();
        lease.claim(request);
        lease.recordTag(request, "held tag");
        assertTrue(lease.release(request, () -> true, actions::add));
        assertFalse(lease.release(request, () -> true, tag -> fail("duplicate release")));
        assertNull(lease.owner());
        assertEquals(Arrays.asList("held tag"), actions);
    }

    @Test public void nonIdleReleaseRetainsOwnershipUntilTerminalCleanup() {
        ReaderModeLease<String> lease = new ReaderModeLease<>();
        Object request = new Object();
        AtomicBoolean idle = new AtomicBoolean(false);
        lease.claim(request);
        lease.recordTag(request, "connected tag");
        assertFalse(lease.release(request, idle::get, tag -> fail("active reader released")));
        assertSame(request, lease.owner());
        idle.set(true);
        assertTrue(lease.release(request, idle::get, tag -> assertEquals("connected tag", tag)));
    }

    @Test public void requestPublishedAfterPauseCannotStartReader() {
        ReaderModeLease<String> lease = new ReaderModeLease<>();
        AtomicLong generation = new AtomicLong(1);
        long admitted = generation.get();
        Object request = new Object();
        AtomicBoolean pending = new AtomicBoolean(false);
        generation.incrementAndGet();
        lease.claim(request);
        pending.set(true);
        assertFalse(lease.runIfOwned(request,
            () -> pending.get() && generation.get() == admitted,
            () -> fail("reader started after pause or disconnect")));
        pending.set(false);
        assertTrue(lease.release(request, () -> !pending.get(), tag -> assertNull(tag)));
    }

    @Test public void currentRequestCanStartReader() {
        ReaderModeLease<String> lease = new ReaderModeLease<>();
        AtomicLong generation = new AtomicLong(1);
        long admitted = generation.get();
        Object request = new Object();
        AtomicBoolean enabled = new AtomicBoolean(false);
        lease.claim(request);
        assertTrue(lease.runIfOwned(request, () -> generation.get() == admitted, () -> enabled.set(true)));
        assertTrue(enabled.get());
    }
}
