import Foundation

enum NFCTransportFailure: Error, Equatable {
    case unavailable
    case busy
    case cancelled
    case backgrounded
    case timedOut
    case cardLost
    case disconnected
    case unsupportedTag
    case multipleTags
    case invalidCommand
    case invalidResponse
    case operationNotStarted
    case communicationFailed
    case closeUnconfirmed
}

struct ReaderSessionState {
    enum Phase: Equatable {
        case idle
        case scanning
        case connecting
        case connected
        case closing
    }

    private(set) var generation: UInt64 = 0
    private(set) var phase = Phase.idle
    private(set) var closeTimedOut = false

    mutating func begin() throws -> UInt64 {
        guard phase == .idle else { throw closeTimedOut ? NFCTransportFailure.closeUnconfirmed : NFCTransportFailure.busy }
        generation &+= 1
        phase = .scanning
        return generation
    }

    func isCurrent(_ token: UInt64) -> Bool {
        generation == token && phase != .idle && phase != .closing
    }

    func isClosing(_ token: UInt64) -> Bool {
        generation == token && phase == .closing
    }

    mutating func beginClosing(_ token: UInt64) -> Bool {
        guard isCurrent(token) else { return false }
        phase = .closing
        return true
    }

    mutating func expireClose(_ token: UInt64) -> Bool {
        guard isClosing(token) else { return false }
        closeTimedOut = true
        return true
    }

    mutating func beginTagConnection(_ token: UInt64) -> Bool {
        guard isCurrent(token), phase == .scanning else { return false }
        phase = .connecting
        return true
    }

    mutating func connect(_ token: UInt64) -> Bool {
        guard isCurrent(token), phase == .connecting else { return false }
        phase = .connected
        return true
    }

    @discardableResult
    mutating func finish(_ token: UInt64) -> Bool {
        guard generation == token, phase != .idle else { return false }
        phase = .idle
        closeTimedOut = false
        return true
    }
}

enum RawAPDU {
    static func decode(_ hex: String) throws -> Data {
        guard (8...522).contains(hex.utf8.count), hex.utf8.count % 2 == 0 else {
            throw NFCTransportFailure.invalidCommand
        }
        let bytes = Array(hex.utf8)
        var command = Data(capacity: bytes.count / 2)
        for offset in stride(from: 0, to: bytes.count, by: 2) {
            guard let high = digit(bytes[offset]), let low = digit(bytes[offset + 1]) else {
                throw NFCTransportFailure.invalidCommand
            }
            command.append(high << 4 | low)
        }
        if command.count > 5 {
            let count = Int(command[4])
            guard count > 0, command.count == 5 + count || command.count == 6 + count else {
                throw NFCTransportFailure.invalidCommand
            }
        }
        return command
    }

    static func encode(_ data: Data) -> String {
        data.map { String(format: "%02x", $0) }.joined()
    }

    private static func digit(_ value: UInt8) -> UInt8? {
        switch value {
        case 48...57: return value - 48
        case 65...70: return value - 55
        case 97...102: return value - 87
        default: return nil
        }
    }
}

struct NFCOperationBudget {
    private let deadline: TimeInterval
    private var remaining: Int

    init(now: TimeInterval, duration: TimeInterval = 20, commands: Int = 48) {
        deadline = now + duration
        remaining = commands
    }

    mutating func consume(now: TimeInterval) throws {
        guard now < deadline, remaining > 0 else { throw NFCTransportFailure.timedOut }
        remaining -= 1
    }

    func timeRemaining(now: TimeInterval) -> TimeInterval {
        max(0, deadline - now)
    }
}
