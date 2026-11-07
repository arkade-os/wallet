#if os(iOS)
import Foundation
import Tauri
import WebKit

private struct TransmitArguments: Decodable {
    let commandHex: String
}

private struct TransportStatus: Encodable {
    let connected: Bool
    let scanning: Bool
    let reader = "iOS NFC"
    let reason: String?

    init(connected: Bool, scanning: Bool = false, reason: String? = nil) {
        self.connected = connected
        self.scanning = scanning
        self.reason = reason
    }
}

private struct TransportResponse: Encodable {
    let dataHex: String
    let statusWord: UInt16
}

public final class SatochipPlugin: Plugin {
    private lazy var transport = ISO7816NFCTransport { [weak self] event in
        let status: TransportStatus
        switch event {
        case .scanning: status = TransportStatus(connected: false, scanning: true)
        case .tagConnected: status = TransportStatus(connected: true)
        case .ended(let failure): status = TransportStatus(connected: false, reason: failure.code)
        }
        DispatchQueue.main.async {
            try? self?.trigger("presence", data: status)
        }
    }

    @objc public func open(_ invoke: Invoke) {
        transport.open { result in
            switch result {
            case .success: invoke.resolve(TransportStatus(connected: true))
            case .failure(let failure): Self.reject(invoke, failure)
            }
        }
    }

    @objc public func begin_operation(_ invoke: Invoke) {
        transport.beginOperation { Self.finish(invoke, $0) }
    }

    @objc public func transmit(_ invoke: Invoke) {
        guard invoke.getRawArgs().utf8.count <= 2048 else {
            Self.reject(invoke, .invalidCommand)
            return
        }
        let command: Data
        do {
            let arguments = try invoke.parseArgs(TransmitArguments.self)
            command = try RawAPDU.decode(arguments.commandHex)
        } catch {
            Self.reject(invoke, .invalidCommand)
            return
        }
        transport.send(command) { result in
            switch result {
            case .success(let response):
                invoke.resolve(TransportResponse(dataHex: RawAPDU.encode(response.data), statusWord: response.statusWord))
            case .failure(let failure): Self.reject(invoke, failure)
            }
        }
    }

    @objc public func end_operation(_ invoke: Invoke) {
        transport.endOperation { Self.finish(invoke, $0) }
    }

    @objc public func disconnect(_ invoke: Invoke) {
        transport.disconnect { Self.finish(invoke, $0) }
    }

    @objc public func cancel(_ invoke: Invoke) {
        transport.cancel { Self.finish(invoke, $0) }
    }

    @objc public func status(_ invoke: Invoke) {
        transport.status { connected, scanning in
            invoke.resolve(TransportStatus(connected: connected, scanning: scanning))
        }
    }

    private static func finish(_ invoke: Invoke, _ result: Result<Void, NFCTransportFailure>) {
        switch result {
        case .success: invoke.resolve()
        case .failure(let failure): reject(invoke, failure)
        }
    }

    private static func reject(_ invoke: Invoke, _ failure: NFCTransportFailure) {
        invoke.reject(failure.message, code: failure.code)
    }
}

@_cdecl("init_plugin_satochip")
public func initPlugin() -> Plugin {
    SatochipPlugin()
}
#endif
