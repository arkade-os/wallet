package io.arkade.wallet

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.os.Build
import androidx.annotation.Keep
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequest
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import app.tauri.plugin.JSObject
import java.util.concurrent.TimeUnit
import org.json.JSONObject

internal object ExpiryReminderPolicy {
    const val DAY_MS = 86_400_000L
    const val MIN_EPOCH_MS = 946_684_800_000L
    const val MAX_FUTURE_MS = 5L * 366 * DAY_MS

    fun validate(expiry: Long?, now: Long): Long? {
        require(expiry == null || expiry in MIN_EPOCH_MS..(now + MAX_FUTURE_MS)) {
            "Wallet expiry must be an epoch timestamp in milliseconds."
        }
        return expiry
    }

    fun delay(expiry: Long, now: Long): Long = (expiry - DAY_MS - now).coerceAtLeast(0)

    fun pending(enabled: Boolean, expiry: Long?, permission: Boolean, deliveredThrough: Long): Boolean =
        enabled && permission && expiry != null && expiry > deliveredThrough

    fun fingerprint(expiry: Long): String = "expiry-v1:$expiry"
}

class WalletBackground(activity: Activity) {
    private val context = activity.applicationContext

    fun status(): JSObject = synchronized(lock) { snapshot() }

    fun configure(enabled: Boolean, nextExpiryMs: Long?): JSObject = synchronized(lock) {
        val expiry = ExpiryReminderPolicy.validate(nextExpiryMs, System.currentTimeMillis())
        val prefs = preferences(context)
        val previous = deadline(prefs)
        check(prefs.edit().putBoolean(ENABLED, enabled).apply {
            if (expiry == null) remove(EXPIRY) else putLong(EXPIRY, expiry)
        }.commit())
        if (!enabled || expiry == null || previous != expiry) notificationManager(context).cancel(NOTIFICATION_ID)

        val manager = WorkManager.getInstance(context)
        if (!ExpiryReminderPolicy.pending(enabled, expiry, permissionGranted(context), prefs.getLong(DELIVERED, 0))) {
            manager.cancelUniqueWork(WORK_NAME).result.get(10, TimeUnit.SECONDS)
            return@synchronized snapshot()
        }

        createChannel(context)
        val fingerprint = ExpiryReminderPolicy.fingerprint(expiry!!)
        val matching = manager.getWorkInfosForUniqueWork(WORK_NAME).get(10, TimeUnit.SECONDS)
            .any { !it.state.isFinished && it.tags.contains(fingerprint) }
        val request = OneTimeWorkRequest.Builder(WalletExpiryWorker::class.java)
            .setInputData(Data.Builder().putLong(EXPIRY, expiry).build())
            .addTag(fingerprint)
            .setInitialDelay(ExpiryReminderPolicy.delay(expiry, System.currentTimeMillis()), TimeUnit.MILLISECONDS)
            .build()
        manager.enqueueUniqueWork(
            WORK_NAME,
            if (matching) ExistingWorkPolicy.KEEP else ExistingWorkPolicy.REPLACE,
            request,
        ).result.get(10, TimeUnit.SECONDS)
        snapshot()
    }

    fun clear(): Unit = synchronized(lock) {
        check(preferences(context).edit().clear().commit())
        try {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME).result.get(10, TimeUnit.SECONDS)
        } finally {
            notificationManager(context).cancel(NOTIFICATION_ID)
        }
    }

    private fun snapshot(): JSObject {
        val prefs = preferences(context)
        val expiry = deadline(prefs)
        val enabled = prefs.getBoolean(ENABLED, false)
        val permission = permissionGranted(context)
        val pending = ExpiryReminderPolicy.pending(enabled, expiry, permission, prefs.getLong(DELIVERED, 0))
        val scheduled = pending && WorkManager.getInstance(context).getWorkInfosForUniqueWork(WORK_NAME)
            .get(10, TimeUnit.SECONDS).any { !it.state.isFinished && it.tags.contains(ExpiryReminderPolicy.fingerprint(expiry!!)) }
        return JSObject().apply {
            put("supported", true)
            put("enabled", enabled)
            put("permissionGranted", permission)
            put("nextExpiryMs", expiry ?: JSONObject.NULL)
            put("reminderAtMs", expiry?.let { it - ExpiryReminderPolicy.DAY_MS } ?: JSONObject.NULL)
            put("scheduled", scheduled)
        }
    }

    internal companion object {
        val lock = Any()
        const val WORK_NAME = "arkade-wallet-expiry"
        const val CHANNEL = "arkade-wallet-reminders"
        const val NOTIFICATION_ID = 23_419
        const val ENABLED = "enabled"
        const val EXPIRY = "nextExpiryMs"
        const val DELIVERED = "deliveredThroughMs"

        fun preferences(context: Context): SharedPreferences =
            context.getSharedPreferences("arkade-wallet-background", Context.MODE_PRIVATE)

        fun deadline(prefs: SharedPreferences): Long? =
            prefs.getLong(EXPIRY, 0).takeIf { it >= ExpiryReminderPolicy.MIN_EPOCH_MS }

        fun notificationManager(context: Context): NotificationManager =
            context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        fun permissionGranted(context: Context): Boolean {
            if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) !=
                PackageManager.PERMISSION_GRANTED) return false
            val manager = notificationManager(context)
            if (!manager.areNotificationsEnabled()) return false
            return Build.VERSION.SDK_INT < 26 || manager.getNotificationChannel(CHANNEL)?.importance != NotificationManager.IMPORTANCE_NONE
        }

        fun createChannel(context: Context) {
            if (Build.VERSION.SDK_INT >= 26) notificationManager(context).createNotificationChannel(
                NotificationChannel(CHANNEL, "Wallet reminders", NotificationManager.IMPORTANCE_DEFAULT).apply {
                    description = "Reminders to open Arkade and review wallet renewal."
                    lockscreenVisibility = Notification.VISIBILITY_PRIVATE
                },
            )
        }
    }
}

@Keep
class WalletExpiryWorker(context: Context, parameters: WorkerParameters) : Worker(context, parameters) {
    @SuppressLint("MissingPermission")
    override fun doWork(): Result = synchronized(WalletBackground.lock) {
        val context = applicationContext
        val prefs = WalletBackground.preferences(context)
        val expiry = inputData.getLong(WalletBackground.EXPIRY, 0)
        val delivered = prefs.getLong(WalletBackground.DELIVERED, 0)
        if (WalletBackground.deadline(prefs) != expiry || !ExpiryReminderPolicy.pending(
                prefs.getBoolean(WalletBackground.ENABLED, false), expiry,
                WalletBackground.permissionGranted(context), delivered,
            )) return@synchronized Result.success()
        if (ExpiryReminderPolicy.delay(expiry, System.currentTimeMillis()) > 0) return@synchronized Result.retry()

        val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
            ?: return@synchronized Result.failure()
        launch.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val pending = PendingIntent.getActivity(
            context, WalletBackground.NOTIFICATION_ID, launch,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        WalletBackground.createChannel(context)
        val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(context, WalletBackground.CHANNEL)
            else Notification.Builder(context)
        val notification = builder
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("Wallet reminder")
            .setContentText("Open Arkade to review your wallet renewal.")
            .setCategory(Notification.CATEGORY_REMINDER)
            .setVisibility(Notification.VISIBILITY_PRIVATE)
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(pending)
            .build()

        // Persist before posting so a process restart cannot repeat an already attempted reminder.
        if (!prefs.edit().putLong(WalletBackground.DELIVERED, expiry).commit()) return@synchronized Result.retry()
        try {
            WalletBackground.notificationManager(context).notify(WalletBackground.NOTIFICATION_ID, notification)
            Result.success()
        } catch (_: SecurityException) {
            prefs.edit().putLong(WalletBackground.DELIVERED, delivered).commit()
            Result.success()
        }
    }
}
