package io.arkade.wallet

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.assertThrows
import org.junit.Test

class ExpiryReminderPolicyTest {
    private val now = 1_793_360_000_000L

    @Test
    fun acceptsPublicEpochMillisecondDeadlinesAndEmptyWallets() {
        assertEquals(now, ExpiryReminderPolicy.validate(now, now))
        assertEquals(now - ExpiryReminderPolicy.DAY_MS, ExpiryReminderPolicy.validate(now - ExpiryReminderPolicy.DAY_MS, now))
        assertEquals(null, ExpiryReminderPolicy.validate(null, now))
    }

    @Test
    fun rejectsSecondsAndInvalidOrImplausibleDeadlines() {
        for (expiry in listOf(0L, -1L, now / 1_000, Long.MAX_VALUE, now + ExpiryReminderPolicy.MAX_FUTURE_MS + 1)) {
            assertThrows(IllegalArgumentException::class.java) { ExpiryReminderPolicy.validate(expiry, now) }
        }
    }

    @Test
    fun schedulesForTwentyFourHoursBeforeExpiry() {
        assertEquals(2 * ExpiryReminderPolicy.DAY_MS, ExpiryReminderPolicy.delay(now + 3 * ExpiryReminderPolicy.DAY_MS, now))
        assertEquals(0, ExpiryReminderPolicy.delay(now + ExpiryReminderPolicy.DAY_MS, now))
        assertEquals(0, ExpiryReminderPolicy.delay(now - ExpiryReminderPolicy.DAY_MS, now))
    }

    @Test
    fun disabledOrDeniedNotificationsAndEmptyWalletsHaveNoWork() {
        assertFalse(ExpiryReminderPolicy.pending(false, now, true, 0))
        assertFalse(ExpiryReminderPolicy.pending(true, now, false, 0))
        assertFalse(ExpiryReminderPolicy.pending(true, null, true, 0))
        assertTrue(ExpiryReminderPolicy.pending(true, now, true, 0))
    }

    @Test
    fun relaunchOrOlderStaleDeadlineCannotRepeatACompletedReminder() {
        assertFalse(ExpiryReminderPolicy.pending(true, now, true, now))
        assertFalse(ExpiryReminderPolicy.pending(true, now - 1, true, now))
        assertTrue(ExpiryReminderPolicy.pending(true, now + 1, true, now))
        assertEquals("expiry-v1:$now", ExpiryReminderPolicy.fingerprint(now))
    }
}
