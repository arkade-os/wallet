import XCTest
@testable import tauri_plugin_satochip

final class ReaderSessionStateTests: XCTestCase {
    func testReaderMustBeIdleBeforeStarting() throws {
        var state = ReaderSessionState()
        let token = try state.begin()
        XCTAssertEqual(state.phase, .scanning)
        XCTAssertThrowsError(try state.begin()) { XCTAssertEqual($0 as? NFCTransportFailure, .busy) }
        XCTAssertTrue(state.beginTagConnection(token))
        XCTAssertEqual(state.phase, .connecting)
        XCTAssertFalse(state.beginTagConnection(token))
        XCTAssertTrue(state.connect(token))
        XCTAssertEqual(state.phase, .connected)
        XCTAssertThrowsError(try state.begin())
    }

    func testCancellationInvalidatesPendingCallbacks() throws {
        var state = ReaderSessionState()
        let cancelled = try state.begin()
        XCTAssertTrue(state.finish(cancelled))
        XCTAssertFalse(state.connect(cancelled))
        XCTAssertFalse(state.finish(cancelled))
        let next = try state.begin()
        XCTAssertNotEqual(cancelled, next)
        XCTAssertFalse(state.connect(cancelled))
        XCTAssertFalse(state.finish(cancelled))
        XCTAssertTrue(state.beginTagConnection(next))
        XCTAssertTrue(state.connect(next))
        XCTAssertTrue(state.isCurrent(next))
    }

    func testFieldLossDoesNotResumeAConnection() throws {
        var state = ReaderSessionState()
        let token = try state.begin()
        XCTAssertTrue(state.beginTagConnection(token))
        XCTAssertTrue(state.connect(token))
        XCTAssertTrue(state.finish(token))
        XCTAssertEqual(state.phase, .idle)
        XCTAssertFalse(state.isCurrent(token))
        XCTAssertFalse(state.connect(token))
    }

    func testCommandBudgetIsSharedAcrossAnOperation() throws {
        var budget = NFCOperationBudget(now: 100, commands: 2)
        try budget.consume(now: 101)
        try budget.consume(now: 102)
        XCTAssertThrowsError(try budget.consume(now: 103)) { XCTAssertEqual($0 as? NFCTransportFailure, .timedOut) }
    }

    func testDeadlineExpiresEvenWithRemainingCommands() throws {
        var budget = NFCOperationBudget(now: 100)
        try budget.consume(now: 119.99)
        XCTAssertEqual(budget.timeRemaining(now: 120), 0)
        XCTAssertThrowsError(try budget.consume(now: 120)) { XCTAssertEqual($0 as? NFCTransportFailure, .timedOut) }
    }

    func testOldConnectionCallbackCannotCompleteNewScan() throws {
        var state = ReaderSessionState()
        let old = try state.begin()
        XCTAssertTrue(state.beginTagConnection(old))
        state.finish(old)
        let current = try state.begin()
        XCTAssertFalse(state.connect(old))
        XCTAssertEqual(state.phase, .scanning)
        XCTAssertTrue(state.beginTagConnection(current))
        XCTAssertTrue(state.connect(current))
        XCTAssertFalse(state.connect(current))
    }

    func testRawAPDUAcceptsShortCommandsAndNormalizesHex() throws {
        XCTAssertEqual(RawAPDU.encode(try RawAPDU.decode("00A40400085361746F43686970")), "00a40400085361746f43686970")
        XCTAssertEqual(try RawAPDU.decode("b03c000000").count, 5)
        XCTAssertEqual(try RawAPDU.decode("00a4040001ff00").count, 7)
    }

    func testRawAPDURejectsMalformedAndOversizedInputs() {
        for invalid in ["", "b03c000", "b03c000000gg", "b03c000002ff", "b03c000000ffff", String(repeating: "ff", count: 262), "b03c0000\n"] {
            XCTAssertThrowsError(try RawAPDU.decode(invalid)) { XCTAssertEqual($0 as? NFCTransportFailure, .invalidCommand) }
        }
    }

    func testCancellationIsDistinguishableFromFieldLoss() {
        XCTAssertEqual(NFCTransportFailure.cancelled.code, "USER_CANCELLED")
        XCTAssertEqual(NFCTransportFailure.cardLost.code, "CARD_LOST")
        XCTAssertNotEqual(NFCTransportFailure.cancelled.message, NFCTransportFailure.cardLost.message)
    }

    func testReaderOwnershipRemainsClosingUntilInvalidationArrives() throws {
        var state = ReaderSessionState()
        let token = try state.begin()
        XCTAssertTrue(state.beginTagConnection(token))
        XCTAssertTrue(state.connect(token))
        XCTAssertTrue(state.beginClosing(token))
        XCTAssertEqual(state.phase, .closing)
        XCTAssertFalse(state.isCurrent(token))
        XCTAssertFalse(state.connect(token))
        XCTAssertThrowsError(try state.begin()) { XCTAssertEqual($0 as? NFCTransportFailure, .busy) }
        XCTAssertTrue(state.finish(token))
        let next = try state.begin()
        XCTAssertNotEqual(token, next)
        XCTAssertFalse(state.finish(token))
        XCTAssertEqual(state.phase, .scanning)
    }

    func testMissingInvalidationCannotReleaseReaderForAnotherScan() throws {
        var state = ReaderSessionState()
        let token = try state.begin()
        XCTAssertTrue(state.beginClosing(token))
        XCTAssertTrue(state.expireClose(token))
        XCTAssertEqual(state.phase, .closing)
        XCTAssertTrue(state.closeTimedOut)
        XCTAssertThrowsError(try state.begin()) { XCTAssertEqual($0 as? NFCTransportFailure, .closeUnconfirmed) }
        XCTAssertFalse(state.isCurrent(token))
        XCTAssertTrue(state.finish(token))
        XCTAssertFalse(state.closeTimedOut)
        XCTAssertNoThrow(try state.begin())
    }
}
