#if canImport(CoreNFC) && os(iOS)
import CoreNFC
import Foundation
import UIKit

final class ISO7816NFCTransport: NSObject, NFCTagReaderSessionDelegate {
    enum Event {
        case scanning
        case tagConnected
        case ended(NFCTransportFailure)
    }

    struct Response {
        let data: Data
        let statusWord: UInt16
    }

    typealias OpenCompletion = (Result<Void, NFCTransportFailure>) -> Void
    typealias SendCompletion = (Result<Response, NFCTransportFailure>) -> Void

    private let queue = DispatchQueue(label: "io.arkade.satochip.nfc")
    private let onEvent: (Event) -> Void
    private var state = ReaderSessionState()
    private var session: NFCTagReaderSession?
    private var tag: NFCISO7816Tag?
    private var opening: OpenCompletion?
    private var sending: (id: UUID, completion: SendCompletion)?
    private var budget: NFCOperationBudget?
    private var expiry: DispatchWorkItem?
    private var expiryID: UUID?
    private var presence: DispatchSourceTimer?
    private var closeExpiry: DispatchWorkItem?
    private var closeWaiters: [OpenCompletion] = []

    init(onEvent: @escaping (Event) -> Void) {
        self.onEvent = onEvent
        super.init()
        NotificationCenter.default.addObserver(self, selector: #selector(backgrounded), name: UIApplication.didEnterBackgroundNotification, object: nil)
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
        expiry?.cancel()
        presence?.cancel()
        closeExpiry?.cancel()
        if let reader = session { DispatchQueue.main.async { reader.invalidate() } }
    }

    func open(completion: @escaping OpenCompletion) {
        queue.async {
            let token: UInt64
            do { token = try self.state.begin() }
            catch let failure as NFCTransportFailure { completion(.failure(failure)); return }
            catch { completion(.failure(.busy)); return }
            self.opening = completion
            self.scheduleExpiry(after: 45, token: token)
            DispatchQueue.main.async {
                let foreground = UIApplication.shared.applicationState == .active
                let available = NFCTagReaderSession.readingAvailable
                self.queue.async {
                    guard self.state.isCurrent(token) else { return }
                    guard foreground else { self.end(.backgrounded, token: token); return }
                    guard available, let reader = NFCTagReaderSession(pollingOption: .iso14443, delegate: self, queue: self.queue) else {
                        self.end(.unavailable, token: token)
                        return
                    }
                    self.session = reader
                    reader.alertMessage = "Hold your Satochip against the top of this iPhone."
                    self.onEvent(.scanning)
                    DispatchQueue.main.async { reader.begin() }
                }
            }
        }
    }

    func beginOperation(completion: @escaping OpenCompletion) {
        queue.async {
            guard self.sending == nil, self.budget == nil else { completion(.failure(.busy)); return }
            guard self.state.phase == .connected, let tag = self.tag else {
                completion(.failure(.disconnected))
                return
            }
            guard tag.isAvailable else {
                self.end(.cardLost, token: self.state.generation)
                completion(.failure(.cardLost))
                return
            }
            self.budget = NFCOperationBudget(now: Self.now)
            self.scheduleExpiry(after: 20, token: self.state.generation)
            completion(.success(()))
        }
    }

    func send(_ command: Data, completion: @escaping SendCompletion) {
        queue.async {
            guard self.sending == nil else { completion(.failure(.busy)); return }
            guard self.state.phase == .connected, let tag = self.tag else {
                completion(.failure(.disconnected))
                return
            }
            guard tag.isAvailable else {
                self.end(.cardLost, token: self.state.generation)
                completion(.failure(.cardLost))
                return
            }
            guard (4...261).contains(command.count), let apdu = NFCISO7816APDU(data: command) else {
                completion(.failure(.invalidCommand))
                return
            }
            guard var budget = self.budget else { completion(.failure(.operationNotStarted)); return }
            let token = self.state.generation
            do { try budget.consume(now: Self.now) }
            catch {
                self.end(.timedOut, token: token)
                completion(.failure(.timedOut))
                return
            }
            self.budget = budget
            let request = UUID()
            self.sending = (request, completion)
            tag.sendCommand(apdu: apdu) { data, sw1, sw2, error in
                self.queue.async {
                    guard self.state.isCurrent(token), self.sending?.id == request else { return }
                    if let error {
                        self.end(Self.failure(error), token: token)
                        return
                    }
                    guard data.count <= 4096 else {
                        self.end(.invalidResponse, token: token)
                        return
                    }
                    self.sending = nil
                    completion(.success(Response(data: data, statusWord: UInt16(sw1) << 8 | UInt16(sw2))))
                }
            }
        }
    }

    func endOperation(completion: @escaping OpenCompletion) {
        queue.async {
            guard self.sending == nil else { completion(.failure(.busy)); return }
            guard self.state.phase == .connected else { completion(.failure(.disconnected)); return }
            self.budget = nil
            self.clearExpiry()
            completion(.success(()))
        }
    }

    func cancel(completion: @escaping OpenCompletion) {
        queue.async {
            self.close(.cancelled, completion: completion)
        }
    }

    func disconnect(completion: @escaping OpenCompletion) {
        queue.async {
            self.close(.disconnected, completion: completion)
        }
    }

    func status(completion: @escaping (_ connected: Bool, _ scanning: Bool) -> Void) {
        queue.async {
            if self.state.phase == .connected, self.tag?.isAvailable != true {
                self.end(.cardLost, token: self.state.generation)
            }
            completion(self.state.phase == .connected, self.state.phase == .scanning || self.state.phase == .connecting)
        }
    }

    @objc private func backgrounded() {
        queue.async { self.end(.backgrounded, token: self.state.generation) }
    }

    func tagReaderSessionDidBecomeActive(_ session: NFCTagReaderSession) {}

    func tagReaderSession(_ session: NFCTagReaderSession, didDetect tags: [NFCTag]) {
        guard self.session === session, state.phase == .scanning else { return }
        let token = state.generation
        guard tags.count == 1 else { end(.multipleTags, token: token); return }
        guard case let .iso7816(isoTag) = tags[0] else { end(.unsupportedTag, token: token); return }
        guard state.beginTagConnection(token) else { return }
        session.connect(to: tags[0]) { error in
            self.queue.async {
                guard self.session === session, self.state.isCurrent(token) else { return }
                if let error { self.end(Self.failure(error), token: token); return }
                guard self.state.connect(token) else { return }
                self.tag = isoTag
                self.clearExpiry()
                self.watchPresence(token: token)
                let completion = self.opening
                self.opening = nil
                self.onEvent(.tagConnected)
                completion?(.success(()))
            }
        }
    }

    func tagReaderSession(_ session: NFCTagReaderSession, didInvalidateWithError error: Error) {
        guard self.session === session else { return }
        if state.isClosing(state.generation) {
            completeClose(token: state.generation)
            return
        }
        end(Self.failure(error), token: state.generation, invalidate: false)
    }

    private func scheduleExpiry(after seconds: TimeInterval, token: UInt64) {
        clearExpiry()
        let identifier = UUID()
        expiryID = identifier
        let work = DispatchWorkItem { [weak self] in
            guard let self, self.expiryID == identifier else { return }
            self.end(.timedOut, token: token)
        }
        expiry = work
        queue.asyncAfter(deadline: .now() + seconds, execute: work)
    }

    private func clearExpiry() {
        expiryID = nil
        expiry?.cancel()
        expiry = nil
    }

    private func watchPresence(token: UInt64) {
        let timer = DispatchSource.makeTimerSource(queue: queue)
        timer.schedule(deadline: .now() + .milliseconds(500), repeating: .milliseconds(500))
        timer.setEventHandler { [weak self] in
            guard let self, self.state.isCurrent(token) else { return }
            if self.tag?.isAvailable != true { self.end(.cardLost, token: token) }
        }
        presence = timer
        timer.resume()
    }

    private func end(_ failure: NFCTransportFailure, token: UInt64, invalidate: Bool = true) {
        guard state.isCurrent(token) else { return }
        let previous = session
        let waitForInvalidation = invalidate && previous != nil
        if waitForInvalidation {
            guard state.beginClosing(token) else { return }
        } else {
            state.finish(token)
            session = nil
        }
        let openCompletion = opening
        let sendCompletion = sending?.completion
        tag = nil
        opening = nil
        sending = nil
        budget = nil
        clearExpiry()
        presence?.cancel()
        presence = nil
        if waitForInvalidation {
            let deadline = DispatchWorkItem { [weak self] in
                guard let self, self.state.expireClose(token) else { return }
                self.resolveClose(.failure(.closeUnconfirmed))
            }
            closeExpiry = deadline
            queue.asyncAfter(deadline: .now() + 3, execute: deadline)
            DispatchQueue.main.async { previous?.invalidate() }
        }
        onEvent(.ended(failure))
        openCompletion?(.failure(failure))
        sendCompletion?(.failure(failure))
        if !waitForInvalidation { resolveClose(.success(())) }
    }

    private func close(_ failure: NFCTransportFailure, completion: @escaping OpenCompletion) {
        if state.phase == .idle {
            completion(.success(()))
            return
        }
        if state.closeTimedOut {
            completion(.failure(.closeUnconfirmed))
            return
        }
        closeWaiters.append(completion)
        if state.phase != .closing { end(failure, token: state.generation) }
    }

    private func completeClose(token: UInt64) {
        guard state.isClosing(token) else { return }
        state.finish(token)
        session = nil
        closeExpiry?.cancel()
        closeExpiry = nil
        resolveClose(.success(()))
    }

    private func resolveClose(_ result: Result<Void, NFCTransportFailure>) {
        let waiters = closeWaiters
        closeWaiters = []
        for completion in waiters { completion(result) }
    }

    private static var now: TimeInterval { ProcessInfo.processInfo.systemUptime }

    private static func failure(_ error: Error) -> NFCTransportFailure {
        guard let readerError = error as? NFCReaderError else { return .communicationFailed }
        switch readerError.code {
        case .readerSessionInvalidationErrorUserCanceled: return .cancelled
        case .readerSessionInvalidationErrorSessionTimeout: return .timedOut
        case .readerTransceiveErrorTagConnectionLost, .readerTransceiveErrorTagNotConnected: return .cardLost
        default: return .communicationFailed
        }
    }
}
#endif
