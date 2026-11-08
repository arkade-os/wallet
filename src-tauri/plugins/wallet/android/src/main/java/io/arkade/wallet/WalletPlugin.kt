package io.arkade.wallet

import android.app.Activity
import android.content.ClipData
import android.content.ClipDescription
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.os.PersistableBundle
import android.view.WindowManager
import android.webkit.WebView
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.ActivityResult
import androidx.appcompat.app.AppCompatActivity
import app.tauri.annotation.Command
import app.tauri.annotation.ActivityCallback
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import java.io.ByteArrayOutputStream
import org.json.JSONObject

@InvokeArg
class SecretArgs {
    var key: String = ""
    var value: String = ""
}

@InvokeArg
class TextArgs {
    var text: String = ""
    var title: String? = null
}

@InvokeArg
class BackArgs {
    var enabled: Boolean = false
}

@InvokeArg
class BackgroundArgs {
    var enabled: Boolean = false
    var nextExpiryMs: Long? = null
}

@InvokeArg
class BackupArgs {
    var contents: String = ""
    var fileName: String = ""
}

@TauriPlugin
class WalletPlugin(private val activity: Activity) : Plugin(activity) {
    private val main = Handler(Looper.getMainLooper())
    private val executor = Executors.newSingleThreadExecutor()
    private val vault = AndroidSecretVault(activity)
    private val background by lazy { WalletBackground(activity) }
    private val pickerBusy = AtomicBoolean(false)
    private lateinit var webView: WebView
    private var pendingIntent: String? = intentUrl(activity.intent)
    private val backCallback = object : OnBackPressedCallback(false) {
        override fun handleOnBackPressed() {
            trigger("back", JSObject())
        }
    }

    override fun load(webView: WebView) {
        this.webView = webView
        activity.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        main.post {
            (activity as? AppCompatActivity)?.let { it.onBackPressedDispatcher.addCallback(it, backCallback) }
        }
    }

    private fun trusted(): Boolean = ::webView.isInitialized && WalletPolicy.trustedOrigin(webView.url, BuildConfig.DEBUG)

    private fun ui(invoke: Invoke, operation: () -> Unit) {
        main.post {
            if (!trusted()) {
                invoke.reject("Native access is restricted to the bundled wallet.")
                return@post
            }
            try { operation() } catch (_: Exception) { invoke.reject("Native wallet operation unavailable.") }
        }
    }

    private fun worker(invoke: Invoke, error: String, operation: () -> Unit) {
        ui(invoke) {
            executor.execute {
                try { operation() } catch (_: Exception) { invoke.reject(error) }
            }
        }
    }

    private fun secret(invoke: Invoke, operation: () -> Unit) = worker(invoke, "Secure storage unavailable.", operation)

    @Command
    fun secretGet(invoke: Invoke) = secret(invoke) {
        val args = invoke.parseArgs(SecretArgs::class.java)
        invoke.resolve(JSObject().put("value", vault.get(args.key) ?: JSONObject.NULL) as JSObject)
    }

    @Command
    fun secretSet(invoke: Invoke) = secret(invoke) {
        val args = invoke.parseArgs(SecretArgs::class.java)
        vault.set(args.key, args.value)
        args.value = ""
        invoke.resolve()
    }

    @Command
    fun secretRemove(invoke: Invoke) = secret(invoke) {
        val args = invoke.parseArgs(SecretArgs::class.java)
        vault.remove(args.key)
        invoke.resolve()
    }

    @Command
    fun clipboardRead(invoke: Invoke) = ui(invoke) {
        val clipboard = activity.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val text = clipboard.primaryClip?.takeIf { it.itemCount > 0 }?.getItemAt(0)?.text?.toString() ?: ""
        check(text.length <= 1_000_000)
        invoke.resolve(JSObject().put("text", text) as JSObject)
    }

    @Command
    fun clipboardWrite(invoke: Invoke) = ui(invoke) {
        val args = invoke.parseArgs(TextArgs::class.java)
        check(args.text.length <= 1_000_000 && !args.text.contains('\u0000'))
        val clipboard = activity.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("Arkade", args.text).apply {
            description.extras = PersistableBundle().apply {
                putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true)
            }
        }
        clipboard.setPrimaryClip(clip)
        invoke.resolve()
    }

    @Command
    fun shareText(invoke: Invoke) = ui(invoke) {
        val args = invoke.parseArgs(TextArgs::class.java)
        check(args.text.length <= 64_000 && (args.title?.length ?: 0) <= 200)
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, args.text)
            args.title?.let { putExtra(Intent.EXTRA_SUBJECT, it) }
        }
        activity.startActivity(Intent.createChooser(intent, "Share from Arkade"))
        invoke.resolve()
    }

    @Command
    fun initialIntent(invoke: Invoke) = ui(invoke) {
        val url = pendingIntent
        pendingIntent = null
        invoke.resolve(JSObject().put("url", url ?: JSONObject.NULL) as JSObject)
    }

    @Command
    fun setBackHandler(invoke: Invoke) = ui(invoke) {
        backCallback.isEnabled = invoke.parseArgs(BackArgs::class.java).enabled
        invoke.resolve()
    }

    @Command
    fun backgroundStatus(invoke: Invoke) = worker(invoke, "Background reminders unavailable.") {
        invoke.resolve(background.status())
    }

    @Command
    fun configureBackground(invoke: Invoke) = worker(invoke, "Background reminders unavailable.") {
        val args = invoke.parseArgs(BackgroundArgs::class.java)
        invoke.resolve(background.configure(args.enabled, args.nextExpiryMs))
    }

    @Command
    fun clearBackground(invoke: Invoke) = worker(invoke, "Background reminders unavailable.") {
        background.clear()
        invoke.resolve()
    }

    @Command
    fun exportBackup(invoke: Invoke) = ui(invoke) {
        val args = invoke.parseArgs(BackupArgs::class.java)
        BackupPolicy.validate(args.contents)
        BackupPolicy.requireName(args.fileName)
        if (!pickerBusy.compareAndSet(false, true)) {
            invoke.reject("Finish the open file picker first.")
            return@ui
        }
        try {
            val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "application/json"
                putExtra(Intent.EXTRA_TITLE, args.fileName)
            }
            startActivityForResult(invoke, intent, "backupExportResult")
        } catch (_: Exception) {
            pickerBusy.set(false)
            invoke.reject("Backup file picker unavailable.")
        }
    }

    @Command
    fun importBackup(invoke: Invoke) = ui(invoke) {
        if (!pickerBusy.compareAndSet(false, true)) {
            invoke.reject("Finish the open file picker first.")
            return@ui
        }
        try {
            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "application/json"
            }
            startActivityForResult(invoke, intent, "backupImportResult")
        } catch (_: Exception) {
            pickerBusy.set(false)
            invoke.reject("Backup file picker unavailable.")
        }
    }

    @ActivityCallback
    private fun backupExportResult(invoke: Invoke, result: ActivityResult) {
        val uri = result.data?.data
        if (result.resultCode != Activity.RESULT_OK || uri == null) {
            pickerBusy.set(false)
            invoke.reject("Backup export cancelled.", "USER_CANCELLED")
            return
        }
        executor.execute {
            try {
                check(uri.scheme == "content")
                val args = invoke.parseArgs(BackupArgs::class.java)
                BackupPolicy.validate(args.contents)
                activity.contentResolver.openOutputStream(uri, "wt").use { output ->
                    check(output != null)
                    output.write(args.contents.toByteArray(Charsets.UTF_8))
                    output.flush()
                }
                invoke.resolve()
            } catch (_: Exception) {
                invoke.reject("Backup export failed. Try saving another file.")
            } finally {
                pickerBusy.set(false)
            }
        }
    }

    @ActivityCallback
    private fun backupImportResult(invoke: Invoke, result: ActivityResult) {
        val uri = result.data?.data
        if (result.resultCode != Activity.RESULT_OK || uri == null) {
            pickerBusy.set(false)
            invoke.reject("Backup import cancelled.", "USER_CANCELLED")
            return
        }
        executor.execute {
            try {
                check(uri.scheme == "content")
                val content = ByteArrayOutputStream()
                activity.contentResolver.openInputStream(uri).use { input ->
                    check(input != null)
                    val buffer = ByteArray(8192)
                    while (true) {
                        val count = input.read(buffer)
                        if (count < 0) break
                        check(content.size().toLong() + count <= BackupPolicy.MAX_BYTES)
                        content.write(buffer, 0, count)
                    }
                }
                invoke.resolve(JSObject().put("contents", BackupPolicy.decode(content.toByteArray())) as JSObject)
            } catch (_: Exception) {
                invoke.reject("Invalid encrypted backup or unreadable file.")
            } finally {
                pickerBusy.set(false)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        val url = intentUrl(intent) ?: return
        pendingIntent = url
        trigger("intent", JSObject().put("url", url) as JSObject)
    }

    override fun onPause(activity: AppCompatActivity) {
        trigger("lifecycle", JSObject().put("state", "paused") as JSObject)
    }

    override fun onResume(activity: AppCompatActivity) {
        activity.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        trigger("lifecycle", JSObject().put("state", "resumed") as JSObject)
    }

    override fun onDestroy(activity: AppCompatActivity) {
        backCallback.remove()
        executor.shutdown()
    }

    private fun intentUrl(intent: Intent?): String? = intent?.takeIf { it.action == Intent.ACTION_VIEW }
        ?.dataString?.takeIf { WalletPolicy.allowedIntent(it) }
}
