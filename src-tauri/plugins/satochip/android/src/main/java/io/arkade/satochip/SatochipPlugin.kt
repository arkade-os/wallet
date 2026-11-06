package io.arkade.satochip

import android.app.Activity
import android.app.AlertDialog
import android.net.Uri
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.IsoDep
import android.os.Handler
import android.os.Looper
import android.text.InputFilter
import android.text.InputType
import android.view.WindowManager
import android.webkit.WebView
import android.widget.EditText
import androidx.appcompat.app.AppCompatActivity
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.nio.charset.StandardCharsets
import java.util.concurrent.Executors
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong
import org.satochip.io.APDUCommand
import org.satochip.io.APDUResponse
import org.satochip.io.CardChannel

@InvokeArg
class SignArgs {
    var hash: String = ""
    var tweak: String? = null
}

@InvokeArg
class ConnectArgs {
    var pin: String? = null
}

@InvokeArg
class SetupArgs {
    var pin: String = ""
    var puk: String? = null
    var seed: String = ""
}

@TauriPlugin
class SatochipPlugin(private val activity: Activity) : Plugin(activity) {
    private val executor = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())
    private val busy = AtomicBoolean(false)
    private val generation = AtomicLong(0)
    private val presenceQueued = AtomicBoolean(false)
    private val stateLock = Any()
    private val readerMode = ReaderModeLease<Tag>()
    private lateinit var webView: WebView
    @Volatile private var session: CardSession? = null
    @Volatile private var transport: BoundedCardChannel? = null
    @Volatile private var inspection: CardSession.Commands? = null
    @Volatile private var pending: ConnectRequest? = null
    private val presenceCheck = object : Runnable {
        override fun run() {
            queueIdlePresence()
            main.postDelayed(this, 1_500)
        }
    }

    private class ConnectRequest(val invoke: Invoke, val generation: Long, val inspect: Boolean = false) {
        val claimed = AtomicBoolean(false)
        val finished = AtomicBoolean(false)
        var pin = ByteArray(0)
        @Volatile var channel: BoundedCardChannel? = null
        var dialog: AlertDialog? = null
        var nativeGuidance = false
    }

    override fun load(webView: WebView) {
        this.webView = webView
        main.removeCallbacks(presenceCheck)
        main.postDelayed(presenceCheck, 1_500)
    }

    private fun queueIdlePresence() {
        val current = session ?: return
        if (busy.get() || executor.isShutdown || !presenceQueued.compareAndSet(false, true)) return
        val admittedGeneration = generation.get()
        executor.execute {
            try {
                if (session === current && generation.get() == admittedGeneration && !busy.get()) current.status()
            } catch (_: Exception) {
                invalidatePresence(current, admittedGeneration)
            } finally {
                presenceQueued.set(false)
            }
        }
    }

    private fun invalidatePresence(current: CardSession, admittedGeneration: Long) {
        synchronized(stateLock) {
            if (session !== current || generation.get() != admittedGeneration) return
            generation.incrementAndGet()
            closeSession(true)
            busy.set(false)
        }
    }

    @Command
    fun connect(invoke: Invoke) {
        val args = invoke.parseArgs(ConnectArgs::class.java)
        val pin = args.pin?.toByteArray(StandardCharsets.US_ASCII)
        val provided = args.pin != null
        val validPin = args.pin == null || args.pin!!.matches(Regex("[0-9]{6,16}"))
        args.pin = null
        if (!validPin) {
            pin?.fill(0)
            invoke.reject("Use a 6–16 digit PIN.")
            return
        }
        if (!admit(invoke)) { pin?.fill(0); return }
        val adapter = enabledAdapter(invoke)
        if (adapter == null) { pin?.fill(0); return }
        val request = ConnectRequest(invoke, generation.incrementAndGet())
        request.pin = pin ?: ByteArray(0)
        readerMode.claim(request)
        pending = request
        // IsoDep.isConnected does not prove RF presence after the user enters their PIN.
        closeSession(releaseReader = false)
        main.post {
            if (provided) beginScan(request, adapter)
            else { request.nativeGuidance = true; showPin(request, adapter) }
        }
    }

    @Command
    fun inspect(invoke: Invoke) {
        if (!admit(invoke)) return
        val adapter = enabledAdapter(invoke) ?: return
        if (session != null || (inspection != null && transport?.isConnected == true)) {
            readStatus(invoke)
            return
        }
        val request = ConnectRequest(invoke, generation.incrementAndGet(), inspect = true)
        readerMode.claim(request)
        pending = request
        closeSession(releaseReader = false)
        main.post { beginScan(request, adapter) }
    }

    private fun enabledAdapter(invoke: Invoke): NfcAdapter? {
        val adapter = NfcAdapter.getDefaultAdapter(activity)
        if (adapter == null || !adapter.isEnabled) {
            busy.set(false)
            invoke.reject(if (adapter == null) "This phone does not have NFC." else "Enable NFC in Android settings, then connect again.")
            return null
        }
        return adapter
    }

    private fun showPin(request: ConnectRequest, adapter: NfcAdapter) {
        if (!isCurrent(request)) { cancelConnect(request, "Card connection cancelled."); return }
        val pin = EditText(activity).apply {
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
            filters = arrayOf(InputFilter.LengthFilter(16))
            setSingleLine(true)
            hint = "6–16 digit card PIN"
            setPadding(40, 24, 40, 24)
            if (android.os.Build.VERSION.SDK_INT >= 26) {
                importantForAutofill = android.view.View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS
            }
        }
        request.dialog = AlertDialog.Builder(activity)
            .setTitle("Unlock Satochip")
            .setMessage("Enter the PIN on this phone. Keep your card ready for the NFC scan.")
            .setView(pin)
            .setPositiveButton("Continue", null)
            .setNegativeButton("Cancel") { _, _ -> cancelConnect(request, "Card connection cancelled.") }
            .setOnCancelListener { cancelConnect(request, "Card connection cancelled.") }
            .create().also { alert ->
                alert.window?.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
                alert.setOnShowListener {
                    alert.window?.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
                    alert.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                        val value = pin.text.toString()
                        if (!value.matches(Regex("[0-9]{6,16}"))) {
                            pin.error = "Use a 6–16 digit PIN."
                        } else {
                            request.pin = value.toByteArray(StandardCharsets.US_ASCII)
                            pin.text.clear()
                            alert.dismiss()
                            beginScan(request, adapter)
                        }
                    }
                }
                alert.show()
            }
    }

    private fun isCurrent(request: ConnectRequest): Boolean = pending === request &&
        !request.finished.get() && generation.get() == request.generation

    private fun beginScan(request: ConnectRequest, adapter: NfcAdapter) {
        if (!isCurrent(request)) { cancelConnect(request, "Card connection cancelled."); return }
        if (request.nativeGuidance) request.dialog = AlertDialog.Builder(activity)
            .setTitle("Hold your Satochip against the phone")
            .setMessage("Keep the card in place while it connects and whenever you sign.")
            .setNegativeButton("Cancel") { _, _ -> cancelConnect(request, "Card connection cancelled.") }
            .setOnCancelListener { cancelConnect(request, "Card connection cancelled.") }
            .show()
        try {
            val enabled = readerMode.runIfOwned(request, { isCurrent(request) }) {
                adapter.enableReaderMode(
                    activity,
                    { tag ->
                        if (generation.get() == request.generation && readerMode.recordTag(request, tag) && isCurrent(request) &&
                            request.claimed.compareAndSet(false, true)) {
                            executor.execute { openCard(request, tag) }
                        }
                    },
                    NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_NFC_B or NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,
                    null,
                )
            }
            if (!enabled) { cancelConnect(request, "Card connection cancelled."); return }
        } catch (_: Exception) {
            cancelConnect(request, "NFC scanning is unavailable. Keep the app open and try again.")
        }
        main.postDelayed({ cancelConnect(request, "NFC connection timed out. Connect again when the card is ready.") }, 45_000)
    }

    private fun openCard(request: ConnectRequest, tag: Tag) {
        try {
            check(isCurrent(request)) { "Card connection cancelled." }
            val iso = IsoDep.get(tag) ?: throw IllegalStateException("This card does not provide an ISO-DEP NFC interface.")
            val channel = BoundedCardChannel(object : CardChannel {
                override fun send(command: APDUCommand): APDUResponse = APDUResponse(iso.transceive(command.serialize()))
                override fun isConnected(): Boolean = iso.isConnected
            }) { runCatching { iso.close() } }
            request.channel = channel
            check(isCurrent(request)) { "Card connection cancelled." }
            iso.connect()
            iso.timeout = 5_000
            completeCard(request, channel, CardSession.official(channel))
        } catch (error: Exception) {
            request.channel?.close()
            cancelConnect(request, safeError(error))
            request.pin.fill(0)
        }
    }

    private fun completeCard(request: ConnectRequest, channel: BoundedCardChannel, commands: CardSession.Commands) {
        var opened: CardSession? = null
        try {
            check(isCurrent(request)) { "Card connection cancelled." }
            val result = if (request.inspect) statusResult(CardSession.inspect(commands, channel)) else {
                opened = CardSession(commands, channel, request.pin)
                JSObject().put("publicKey", opened.publicKey().hex()).put("name", "Satochip")
            }
            synchronized(stateLock) {
                if (pending !== request || generation.get() != request.generation ||
                    !request.finished.compareAndSet(false, true)) {
                    opened?.close()
                    channel.close()
                    return
                }
                session = opened
                inspection = if (request.inspect) commands else null
                transport = channel
                pending = null
                busy.set(false)
            }
            main.post { request.dialog?.dismiss(); request.dialog = null }
            request.invoke.resolve(result)
        } catch (error: Exception) {
            opened?.close()
            cancelConnect(request, safeError(error))
        } finally {
            if (request.finished.get() && transport !== channel) {
                channel.close()
                commands.disconnect()
            }
            request.pin.fill(0)
        }
    }

    @Command
    fun setup(invoke: Invoke) {
        val args = invoke.parseArgs(SetupArgs::class.java)
        val pin = args.pin.toByteArray(StandardCharsets.US_ASCII)
        val puk = args.puk?.toByteArray(StandardCharsets.US_ASCII)
        val seed: ByteArray
        try {
            require(args.pin.matches(Regex("[0-9]{6,16}")))
            require(args.puk == null || args.puk!!.matches(Regex("[0-9a-fA-F]{16}")))
            seed = args.seed.hexBytes(64)
        } catch (_: Exception) {
            pin.fill(0)
            puk?.fill(0)
            invoke.reject("Provide a 6–16 digit PIN, a 16-character recovery code when needed, and a 64-byte seed.")
            return
        } finally {
            args.pin = ""
            args.puk = null
            args.seed = ""
        }
        if (!admit(invoke)) { pin.fill(0); puk?.fill(0); seed.fill(0); return }
        val admittedGeneration = generation.incrementAndGet()
        executor.execute {
            try {
                val commands = inspection ?: throw IllegalStateException("Tap your card again before setting it up.")
                val channel = transport ?: throw IllegalStateException("Tap your card again before setting it up.")
                check(channel.isConnected) { "Keep your card against the phone, then inspect it again." }
                val result = CardSession.setup(commands, channel, pin, puk, seed)
                check(generation.get() == admittedGeneration) { "Card setup was interrupted. Inspect the card before retrying." }
                invoke.resolve(statusResult(result.policy).put("publicKey", result.publicKey.hex()))
            } catch (error: Exception) {
                if (generation.get() == admittedGeneration) closeSession(true)
                invoke.reject(safeError(error))
            } finally {
                pin.fill(0)
                puk?.fill(0)
                seed.fill(0)
                if (generation.get() == admittedGeneration) busy.set(false)
            }
        }
    }

    @Command
    fun getPublicKey(invoke: Invoke) = withSession(invoke) {
        JSObject().put("publicKey", it.publicKey().hex())
    }

    @Command
    fun signSchnorr(invoke: Invoke) {
        val args = invoke.parseArgs(SignArgs::class.java)
        val hash: ByteArray
        val tweak: ByteArray?
        try {
            hash = args.hash.hexBytes(32)
            tweak = args.tweak?.let { value -> if (value.isEmpty()) ByteArray(0) else value.hexBytes(32) }
        } catch (_: Exception) {
            invoke.reject("Provide a 32-byte hash and a null, empty, or 32-byte tweak.")
            return
        }
        withSession(invoke) { JSObject().put("signature", it.signSchnorr(hash, tweak).hex()) }
    }

    @Command
    fun signEcdsa(invoke: Invoke) {
        val hash = try { invoke.parseArgs(SignArgs::class.java).hash.hexBytes(32) } catch (_: Exception) {
            invoke.reject("Provide a 32-byte hash.")
            return
        }
        withSession(invoke) { JSObject().put("signature", it.signEcdsa(hash).hex()) }
    }

    @Command
    fun status(invoke: Invoke) {
        if (!admit(invoke)) return
        readStatus(invoke)
    }

    private fun readStatus(invoke: Invoke) {
        val admittedGeneration = generation.get()
        executor.execute {
            try {
                val current = session
                val policy = current?.status() ?: inspection?.let { commands ->
                    transport?.begin()
                    CardSession.readPolicy(commands)
                }
                check(generation.get() == admittedGeneration) { "Card inspection was interrupted. Tap the card again." }
                invoke.resolve(statusResult(policy))
            } catch (error: Exception) {
                if (generation.get() == admittedGeneration) closeSession(true)
                invoke.reject(safeError(error))
            } finally {
                if (generation.get() == admittedGeneration) busy.set(false)
            }
        }
    }

    private fun statusResult(policy: CardPolicy?): JSObject {
        val adapter = NfcAdapter.getDefaultAdapter(activity)
        return JSObject()
            .put("present", policy != null)
            .put("reader", "Android NFC")
            .put("version", policy?.version ?: "")
            .put("setupDone", policy?.setupDone ?: false)
            .put("seeded", policy?.seeded ?: false)
            .put("needs2FA", policy?.needs2FA ?: false)
            .put("schnorrEnabled", policy?.schnorrEnabled ?: false)
            .put("untweakedSchnorrEnabled", policy?.untweakedSchnorrEnabled ?: false)
            .put("ready", policy?.ready() ?: false)
            .put("available", adapter != null)
            .put("enabled", adapter?.isEnabled == true)
    }

    @Command
    fun disconnect(invoke: Invoke) {
        if (!trusted()) { invoke.reject("Native card access is restricted to the wallet host."); return }
        generation.incrementAndGet()
        pending?.let { cancelConnect(it, "Card connection cancelled.") }
        closeSession()
        busy.set(false)
        invoke.resolve(JSObject())
    }

    @Command
    fun presence(invoke: Invoke) {
        if (!admit(invoke)) return
        val admittedGeneration = generation.get()
        executor.execute {
            val current = session
            var connected = false
            try {
                if (current != null) {
                    current.status()
                    connected = session === current && generation.get() == admittedGeneration
                }
            } catch (_: Exception) {
                if (current != null) invalidatePresence(current, admittedGeneration)
            } finally {
                if (generation.get() == admittedGeneration) busy.set(false)
            }
            invoke.resolve(JSObject().put("connected", connected))
        }
    }

    private fun withSession(invoke: Invoke, operation: (CardSession) -> JSObject) {
        if (!admit(invoke)) return
        val admittedGeneration = generation.get()
        executor.execute {
            try {
                val current = session ?: throw IllegalStateException("Hold your Satochip against the phone and connect it again.")
                invoke.resolve(operation(current))
            } catch (error: Exception) {
                if (generation.get() == admittedGeneration) closeSession(true)
                invoke.reject(safeError(error))
            } finally {
                if (generation.get() == admittedGeneration) busy.set(false)
            }
        }
    }

    private fun admit(invoke: Invoke): Boolean {
        if (!trusted()) { invoke.reject("Native card access is restricted to the wallet host."); return false }
        if (!busy.compareAndSet(false, true)) { invoke.reject("The card is busy. Wait for the current action to finish."); return false }
        return true
    }

    private fun trusted(): Boolean {
        if (!::webView.isInitialized) return false
        if (Looper.myLooper() != Looper.getMainLooper()) {
            val result = AtomicBoolean(false)
            val completed = CountDownLatch(1)
            main.post { try { result.set(trusted()) } finally { completed.countDown() } }
            return completed.await(2, TimeUnit.SECONDS) && result.get()
        }
        val url = Uri.parse(webView.url ?: return false)
        if (url.scheme == "tauri" && url.host == "localhost") return true
        if (url.scheme !in listOf("http", "https")) return false
        if (url.host == "tauri.localhost") return true
        return BuildConfig.DEBUG && url.host in listOf("localhost", "127.0.0.1") && url.port == 3002
    }

    private fun cancelConnect(request: ConnectRequest, message: String) {
        if (!request.finished.compareAndSet(false, true)) return
        if (pending === request) pending = null
        request.channel?.close()
        if (!request.claimed.get()) request.pin.fill(0)
        if (generation.get() == request.generation) busy.set(false)
        releaseReaderMode(request)
        main.post {
            request.dialog?.dismiss()
            request.dialog = null
        }
        request.invoke.reject(message)
    }

    private fun closeSession(notify: Boolean = false, releaseReader: Boolean = true) {
        val readerOwner = readerMode.owner()
        val previous = synchronized(stateLock) {
            val handles = Triple(session, inspection, transport)
            transport = null
            session = null
            inspection = null
            handles
        }
        previous.third?.close()
        if (previous.first != null) {
            if (executor.isShutdown) previous.first?.close()
            else executor.execute { previous.first?.close() }
        }
        if (previous.second != null) {
            if (executor.isShutdown) previous.second?.disconnect()
            else executor.execute { previous.second?.disconnect() }
        }
        if (notify && previous.first != null) trigger("disconnected", JSObject())
        if (releaseReader) releaseReaderMode(readerOwner)
    }

    private fun releaseReaderMode(owner: Any?) {
        main.post {
            readerMode.release(owner, { pending == null && inspection == null && session == null }) { tag ->
                val adapter = runCatching { NfcAdapter.getDefaultAdapter(activity) }.getOrNull()
                if (tag != null) runCatching { adapter?.ignore(tag, 250, null, null) }
                runCatching { adapter?.disableReaderMode(activity) }
            }
        }
    }

    override fun onPause(activity: AppCompatActivity) {
        main.removeCallbacks(presenceCheck)
        val wasConnected = session != null || inspection != null || pending != null
        generation.incrementAndGet()
        pending?.let { cancelConnect(it, "The app left the foreground. Connect the card again to sign.") }
        closeSession()
        busy.set(false)
        if (wasConnected) trigger("disconnected", JSObject())
    }

    override fun onResume(activity: AppCompatActivity) {
        main.removeCallbacks(presenceCheck)
        main.postDelayed(presenceCheck, 1_500)
    }

    override fun onDestroy(activity: AppCompatActivity) {
        onPause(activity)
        executor.shutdown()
    }

    private fun safeError(error: Exception): String = CardFailure.message(error)

    private fun ByteArray.hex(): String = joinToString("") { "%02x".format(it.toInt() and 0xff) }
    private fun String.hexBytes(length: Int): ByteArray {
        require(this.length == length * 2 && matches(Regex("[0-9a-fA-F]+")))
        return ByteArray(length) { index -> substring(index * 2, index * 2 + 2).toInt(16).toByte() }
    }
}
