package io.arkade.wallet

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Process
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.work.WorkInfo
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class WalletBackgroundTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val context = instrumentation.targetContext
    private val preferences get() = WalletBackground.preferences(context)
    private val manager get() = WorkManager.getInstance(context)
    private lateinit var background: WalletBackground
    private var originalPreferences: Map<String, *> = emptyMap<String, Any>()
    private var prepared = false

    @Before
    fun prepare() {
        assertTrue(Build.VERSION.SDK_INT >= 33)
        assertEquals("io.arkade.wallet.vault.test", context.packageName)
        assertEquals(context.packageName, instrumentation.context.packageName)
        assertEquals(context.applicationInfo.uid, Process.myUid())
        assertEquals("Prepare denied POST_NOTIFICATIONS externally before running this isolated class",
            PackageManager.PERMISSION_DENIED, context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS))
        assertTrue("Refusing preexisting active reminder work", activeWork().isEmpty())
        assertNull("Refusing an existing reminder channel", WalletBackground.notificationManager(context).getNotificationChannel(WalletBackground.CHANNEL))
        val original = preferences.all
        assertTrue(original.keys.all { it in setOf(WalletBackground.ENABLED, WalletBackground.EXPIRY, WalletBackground.DELIVERED) })
        assertTrue(original.all { (key, value) -> if (key == WalletBackground.ENABLED) value is Boolean else value is Long })
        val testApplicationContext = context.applicationContext
        instrumentation.runOnMainSync {
            background = WalletBackground(object : Activity() {
                override fun getApplicationContext(): Context = testApplicationContext
            })
        }
        originalPreferences = original.toMap()
        prepared = true
    }

    @After
    fun cleanup() {
        if (!prepared) return
        manager.cancelUniqueWork(WalletBackground.WORK_NAME).result.get(10, TimeUnit.SECONDS)
        assertTrue(activeWork().isEmpty())
        val editor = preferences.edit().clear()
        originalPreferences.forEach { (key, value) ->
            when (value) {
                is Boolean -> editor.putBoolean(key, value)
                is Long -> editor.putLong(key, value)
                else -> error("Unexpected reminder preference type")
            }
        }
        assertTrue(editor.commit())
        WalletBackground.notificationManager(context).deleteNotificationChannel(WalletBackground.CHANNEL)
        assertEquals(originalPreferences, preferences.all)
        assertNull(WalletBackground.notificationManager(context).getNotificationChannel(WalletBackground.CHANNEL))
    }

    @Test
    fun permissionRecoveryRearmsUnchangedDeadlineAndKeepsMatchingWork() {
        val expiry = System.currentTimeMillis() + 3 * ExpiryReminderPolicy.DAY_MS
        assertTrue(preferences.edit().clear().putBoolean(WalletBackground.ENABLED, true)
            .putLong(WalletBackground.EXPIRY, expiry).commit())
        val denied = background.configure(true, expiry)
        assertTrue(denied.getBoolean("enabled"))
        assertEquals(expiry, denied.getLong("nextExpiryMs"))
        assertFalse(denied.getBoolean("permissionGranted"))
        assertFalse(denied.getBoolean("scheduled"))
        assertTrue(activeWork().isEmpty())

        instrumentation.uiAutomation.grantRuntimePermission(context.packageName, Manifest.permission.POST_NOTIFICATIONS)
        assertEquals(PackageManager.PERMISSION_GRANTED, context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS))
        val recovered = background.configure(true, expiry)
        assertTrue(recovered.getBoolean("enabled"))
        assertTrue(recovered.getBoolean("permissionGranted"))
        assertTrue(recovered.getBoolean("scheduled"))
        assertEquals(expiry, recovered.getLong("nextExpiryMs"))
        val first = activeWork().single()
        assertEquals(WorkInfo.State.ENQUEUED, first.state)
        assertTrue(first.tags.contains(ExpiryReminderPolicy.fingerprint(expiry)))
        assertTrue(ExpiryReminderPolicy.delay(expiry, System.currentTimeMillis()) > ExpiryReminderPolicy.DAY_MS)

        val repeated = background.configure(true, expiry)
        assertTrue(repeated.getBoolean("scheduled"))
        assertEquals(first.id, activeWork().single().id)
        assertTrue(preferences.edit().putLong(WalletBackground.DELIVERED, expiry).commit())
        val delivered = background.configure(true, expiry)
        assertTrue(delivered.getBoolean("enabled"))
        assertFalse(delivered.getBoolean("scheduled"))
        assertTrue(activeWork().isEmpty())
        instrumentation.sendStatus(0, Bundle().apply {
            putString("stream", "\nBACKGROUND_RECOVERY denied=true restored=true sameDeadline=true keepSameId=true deliveredSuppressed=true\n")
        })
    }

    private fun activeWork(): List<WorkInfo> = manager.getWorkInfosForUniqueWork(WalletBackground.WORK_NAME)
        .get(10, TimeUnit.SECONDS).filterNot { it.state.isFinished }
}
