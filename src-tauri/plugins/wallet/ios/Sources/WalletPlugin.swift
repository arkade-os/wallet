import Foundation
import Tauri
import UIKit
import UniformTypeIdentifiers
import WebKit

private struct SecretArgs: Decodable { let key: String; let value: String? }
private struct TextArgs: Decodable { let text: String; let title: String? }
private struct BackArgs: Decodable { let enabled: Bool }
private struct BackgroundArgs: Decodable { let enabled: Bool; let nextExpiryMs: Int64? }
private struct BackupArgs: Decodable { let contents: String; let fileName: String }
private struct IntentArgs: Decodable { let url: String }

private enum WalletServiceError: Error { case unavailable, busy, invalidArguments }

final class WalletPlugin: Plugin, UIDocumentPickerDelegate, UIAdaptivePresentationControllerDelegate {
    private weak var webview: WKWebView?
    private let worker = DispatchQueue(label: "io.arkade.wallet.services")
    private var vault: KeychainVault?
    private var storageReady = false
    private var observers: [NSObjectProtocol] = []
    private var privacyCover: UIView?
    private var backgrounded = false
    private var pendingIntent: String?
    private var activePresentation: UIViewController?
    private var presentationInvoke: Invoke?
    private var exportDirectory: URL?
    private var exporting = false

    override func load(webview: WKWebView) {
        DispatchQueue.main.async {
            self.webview = webview
            self.prepareStorage()
            let center = NotificationCenter.default
            self.observers.forEach { center.removeObserver($0) }
            self.observers.removeAll()
            self.observers.append(center.addObserver(
                forName: UIApplication.willResignActiveNotification, object: nil, queue: .main
            ) { [weak self] _ in self?.cover() })
            self.observers.append(center.addObserver(
                forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main
            ) { [weak self] _ in self?.pause() })
            self.observers.append(center.addObserver(
                forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main
            ) { [weak self] _ in self?.resume() })
        }
    }

    deinit {
        observers.forEach { NotificationCenter.default.removeObserver($0) }
    }

    private func trusted() -> Bool {
        #if DEBUG
        let debug = true
        #else
        let debug = false
        #endif
        return WalletPolicy.trustedOrigin(webview?.url, debug: debug)
    }

    private func ui(_ invoke: Invoke, operation: @escaping () throws -> Void) {
        DispatchQueue.main.async {
            guard self.trusted() else {
                invoke.reject("Native access is restricted to the bundled wallet.")
                return
            }
            do { try operation() } catch {
                if case WalletServiceError.busy = error {
                    invoke.reject("Finish the open system sheet first.")
                } else { invoke.reject("Native wallet operation unavailable.") }
            }
        }
    }

    private func secret(_ invoke: Invoke, operation: @escaping (KeychainVault) throws -> JsonObject?) {
        ui(invoke) {
            guard self.storageReady, let vault = self.vault else {
                invoke.reject("Secure storage unavailable.")
                return
            }
            self.worker.async {
                do {
                    let result = try operation(vault)
                    DispatchQueue.main.async {
                        guard self.trusted(), self.storageReady else {
                            invoke.reject("Secure storage unavailable.")
                            return
                        }
                        if let result = result { invoke.resolve(result) } else { invoke.resolve() }
                    }
                } catch { invoke.reject("Secure storage unavailable.") }
            }
        }
    }

    @objc public func secretGet(_ invoke: Invoke) {
        secret(invoke) { vault in
            let args = try invoke.parseArgs(SecretArgs.self)
            return ["value": try vault.get(args.key) as Any? ?? NSNull()]
        }
    }

    @objc public func secretSet(_ invoke: Invoke) {
        secret(invoke) { vault in
            let args = try invoke.parseArgs(SecretArgs.self)
            guard let value = args.value else { throw WalletServiceError.invalidArguments }
            try vault.set(args.key, value: value)
            return nil
        }
    }

    @objc public func secretRemove(_ invoke: Invoke) {
        secret(invoke) { vault in
            try vault.remove(invoke.parseArgs(SecretArgs.self).key)
            return nil
        }
    }

    @objc public func clipboardRead(_ invoke: Invoke) {
        ui(invoke) {
            let text = UIPasteboard.general.string ?? ""
            guard text.utf8.count <= 1_000_000 else { throw WalletServiceError.invalidArguments }
            invoke.resolve(["text": text] as JsonObject)
        }
    }

    @objc public func clipboardWrite(_ invoke: Invoke) {
        ui(invoke) {
            let args = try invoke.parseArgs(TextArgs.self)
            guard args.text.utf8.count <= 1_000_000, !args.text.contains("\0") else {
                throw WalletServiceError.invalidArguments
            }
            UIPasteboard.general.setItems([[UTType.utf8PlainText.identifier: args.text]],
                                          options: [.localOnly: true])
            invoke.resolve()
        }
    }

    @objc public func shareText(_ invoke: Invoke) {
        ui(invoke) {
            let args = try invoke.parseArgs(TextArgs.self)
            guard args.text.utf8.count <= 64_000, (args.title?.utf8.count ?? 0) <= 200 else {
                throw WalletServiceError.invalidArguments
            }
            let presenter = try self.presenter()
            let sheet = UIActivityViewController(activityItems: [args.text], applicationActivities: nil)
            if let title = args.title { sheet.setValue(title, forKey: "subject") }
            self.activePresentation = sheet
            self.presentationInvoke = invoke
            sheet.completionWithItemsHandler = { [weak self, weak sheet] _, completed, _, error in
                DispatchQueue.main.async {
                    guard let self = self, let sheet = sheet, self.activePresentation === sheet else { return }
                    self.finishPresentation(cancelled: !completed && error == nil, failed: error != nil)
                }
            }
            UIUtils.centerPopover(rootViewController: presenter, popoverController: sheet)
            presenter.present(sheet, animated: true)
            sheet.presentationController?.delegate = self
        }
    }

    @objc public func initialIntent(_ invoke: Invoke) {
        ui(invoke) {
            let url = self.pendingIntent
            self.pendingIntent = nil
            invoke.resolve(["url": url as Any? ?? NSNull()] as JsonObject)
        }
    }

    @objc public func receiveIntent(_ invoke: Invoke) {
        DispatchQueue.main.async {
            do {
                let url = try invoke.parseArgs(IntentArgs.self).url
                guard WalletPolicy.allowedIntent(url) else { throw WalletServiceError.invalidArguments }
                self.pendingIntent = url
                if self.trusted() { self.trigger("intent", data: ["url": url]) }
                invoke.resolve()
            } catch { invoke.reject("Invalid wallet link.") }
        }
    }

    @objc public func setBackHandler(_ invoke: Invoke) {
        ui(invoke) {
            _ = try invoke.parseArgs(BackArgs.self)
            invoke.resolve()
        }
    }

    @objc public func backgroundStatus(_ invoke: Invoke) {
        ui(invoke) { invoke.resolve(["supported": false, "enabled": false] as JsonObject) }
    }

    @objc public func configureBackground(_ invoke: Invoke) {
        ui(invoke) {
            let args = try invoke.parseArgs(BackgroundArgs.self)
            guard args.nextExpiryMs == nil || args.nextExpiryMs! >= 0 else {
                throw WalletServiceError.invalidArguments
            }
            invoke.resolve(["supported": false, "enabled": false] as JsonObject)
        }
    }

    @objc public func clearBackground(_ invoke: Invoke) {
        ui(invoke) { invoke.resolve() }
    }

    @objc public func exportBackup(_ invoke: Invoke) {
        ui(invoke) {
            let args = try invoke.parseArgs(BackupArgs.self)
            try WalletPolicy.validateBackupName(args.fileName)
            _ = try self.presenter()
            self.presentationInvoke = invoke
            self.exporting = true
            self.worker.async {
                var temporary: URL?
                do {
                    let data = Data(args.contents.utf8)
                    _ = try WalletPolicy.validateBackup(data)
                    let directory = try self.createExportDirectory()
                    temporary = directory
                    let file = directory.appendingPathComponent(args.fileName, isDirectory: false)
                    try data.write(to: file, options: [.atomic, .completeFileProtection])
                    DispatchQueue.main.async {
                        guard self.trusted(), UIApplication.shared.applicationState == .active,
                              let presenter = self.manager.viewController, presenter.viewIfLoaded?.window != nil,
                              presenter.presentedViewController == nil else {
                            self.exportDirectory = directory
                            self.finishPresentation(failed: true)
                            return
                        }
                        let picker = UIDocumentPickerViewController(forExporting: [file], asCopy: true)
                        self.exportDirectory = directory
                        self.presentPicker(picker, from: presenter)
                    }
                } catch {
                    if let directory = temporary { try? FileManager.default.removeItem(at: directory) }
                    DispatchQueue.main.async { self.finishPresentation(failed: true) }
                }
            }
        }
    }

    @objc public func importBackup(_ invoke: Invoke) {
        ui(invoke) {
            let presenter = try self.presenter()
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.json], asCopy: false)
            picker.allowsMultipleSelection = false
            self.presentationInvoke = invoke
            self.exporting = false
            self.presentPicker(picker, from: presenter)
        }
    }

    private func presenter() throws -> UIViewController {
        guard presentationInvoke == nil, activePresentation == nil else { throw WalletServiceError.busy }
        guard UIApplication.shared.applicationState == .active,
              let presenter = manager.viewController, presenter.viewIfLoaded?.window != nil,
              presenter.presentedViewController == nil else { throw WalletServiceError.unavailable }
        return presenter
    }

    private func presentPicker(_ picker: UIDocumentPickerViewController, from presenter: UIViewController) {
        activePresentation = picker
        picker.delegate = self
        UIUtils.centerPopover(rootViewController: presenter, popoverController: picker)
        presenter.present(picker, animated: true)
        picker.presentationController?.delegate = self
    }

    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        guard activePresentation === controller else { return }
        finishPresentation(cancelled: true)
    }

    func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        guard activePresentation === presentationController.presentedViewController else { return }
        finishPresentation(cancelled: true)
    }

    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard activePresentation === controller else { return }
        if exporting {
            finishPresentation()
            return
        }
        guard urls.count == 1, let url = urls.first else {
            finishPresentation(failed: true)
            return
        }
        // The picker has returned; keep the operation reserved until the bounded read finishes.
        activePresentation = nil
        worker.async {
            do {
                let contents = try self.readBackup(url)
                DispatchQueue.main.async { self.finishPresentation(contents: contents) }
            } catch { DispatchQueue.main.async { self.finishPresentation(failed: true) } }
        }
    }

    private func finishPresentation(contents: String? = nil, cancelled: Bool = false, failed: Bool = false) {
        guard let invoke = presentationInvoke else { return }
        let temporary = exportDirectory
        activePresentation = nil
        presentationInvoke = nil
        exportDirectory = nil
        exporting = false
        if let directory = temporary { worker.async { try? FileManager.default.removeItem(at: directory) } }
        if cancelled { invoke.reject("USER_CANCELLED", code: "USER_CANCELLED") }
        else if failed || !trusted() { invoke.reject("Native wallet operation unavailable.") }
        else if let contents = contents { invoke.resolve(["contents": contents] as JsonObject) }
        else { invoke.resolve() }
    }

    private func createExportDirectory() throws -> URL {
        let root = try FileManager.default.url(for: .cachesDirectory, in: .userDomainMask,
                                              appropriateFor: nil, create: true)
            .appendingPathComponent("arkade-backup-exports", isDirectory: true)
        let directory = root.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true,
                                               attributes: [.protectionKey: FileProtectionType.complete])
        var excluded = URLResourceValues()
        excluded.isExcludedFromBackup = true
        var mutable = directory
        do { try mutable.setResourceValues(excluded) } catch {
            try? FileManager.default.removeItem(at: directory)
            throw error
        }
        return directory
    }

    private func readBackup(_ url: URL) throws -> String {
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        let coordinator = NSFileCoordinator()
        var coordinationError: NSError?
        var result: Result<String, Error>?
        coordinator.coordinate(readingItemAt: url, options: [], error: &coordinationError) { coordinated in
            result = Result {
                let values = try coordinated.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey])
                guard values.isRegularFile == true, let size = values.fileSize,
                      size >= 0, size <= WalletPolicy.backupLimit else { throw WalletPolicyError.invalidBackup }
                let handle = try FileHandle(forReadingFrom: coordinated)
                defer { try? handle.close() }
                var data = Data()
                while let chunk = try handle.read(upToCount: 64 * 1_024), !chunk.isEmpty {
                    guard chunk.count <= WalletPolicy.backupLimit - data.count else {
                        throw WalletPolicyError.invalidBackup
                    }
                    data.append(chunk)
                }
                return try WalletPolicy.validateBackup(data)
            }
        }
        guard coordinationError == nil, let result = result else { throw WalletPolicyError.invalidBackup }
        return try result.get()
    }

    private func prepareStorage() {
        do {
            let files = FileManager.default
            for location in [FileManager.SearchPathDirectory.libraryDirectory, .documentDirectory] {
                let directory = try files.url(for: location, in: .userDomainMask,
                                              appropriateFor: nil, create: true)
                var excluded = URLResourceValues()
                excluded.isExcludedFromBackup = true
                var mutable = directory
                try mutable.setResourceValues(excluded)
            }
            guard let identifier = Bundle.main.bundleIdentifier else { throw WalletServiceError.unavailable }
            if vault == nil { vault = try KeychainVault(service: identifier) }
            storageReady = true
        } catch { storageReady = false }
    }

    private func cover() {
        if privacyCover == nil, let view = manager.viewController?.view {
            let cover = UIView(frame: view.bounds)
            cover.backgroundColor = .black
            cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            view.addSubview(cover)
            privacyCover = cover
        }
    }

    private func pause() {
        cover()
        guard !backgrounded else { return }
        backgrounded = true
        if trusted() { trigger("lifecycle", data: ["state": "paused"]) }
    }

    private func resume() {
        prepareStorage()
        privacyCover?.removeFromSuperview()
        privacyCover = nil
        if storageReady, backgrounded {
            backgrounded = false
            if trusted() { trigger("lifecycle", data: ["state": "resumed"]) }
        }
    }
}

@_cdecl("init_plugin_wallet")
public func initPlugin() -> Plugin { WalletPlugin() }
