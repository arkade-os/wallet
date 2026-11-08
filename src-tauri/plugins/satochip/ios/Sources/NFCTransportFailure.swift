import Foundation

extension NFCTransportFailure {
    var code: String {
        switch self {
        case .cancelled: return "USER_CANCELLED"
        case .unavailable: return "NFC_UNAVAILABLE"
        case .busy: return "CARD_BUSY"
        case .backgrounded: return "APP_BACKGROUNDED"
        case .timedOut: return "CARD_TIMEOUT"
        case .cardLost: return "CARD_LOST"
        case .disconnected: return "CARD_DISCONNECTED"
        case .unsupportedTag: return "UNSUPPORTED_TAG"
        case .multipleTags: return "MULTIPLE_TAGS"
        case .invalidCommand: return "INVALID_APDU"
        case .invalidResponse: return "INVALID_CARD_RESPONSE"
        case .operationNotStarted: return "CARD_OPERATION_REQUIRED"
        case .communicationFailed: return "CARD_IO_FAILED"
        case .closeUnconfirmed: return "NFC_CLOSE_UNCONFIRMED"
        }
    }

    var message: String {
        switch self {
        case .cancelled: return "Card connection cancelled."
        case .unavailable: return "NFC card reading is unavailable on this device."
        case .busy: return "Finish the current card operation before starting another."
        case .backgrounded: return "Keep Arkade open and connect your card again."
        case .timedOut: return "The card operation timed out. Connect the card again to continue."
        case .cardLost, .disconnected: return "Hold your Satochip against the top of this iPhone and connect it again."
        case .unsupportedTag: return "This card does not provide the required ISO7816 NFC interface."
        case .multipleTags: return "Present one card at a time, then connect again."
        case .invalidCommand: return "The card request is invalid."
        case .invalidResponse: return "The card returned an invalid response. Connect it again."
        case .operationNotStarted: return "Start a card operation before sending a request."
        case .communicationFailed: return "The card could not complete this operation. Connect it again."
        case .closeUnconfirmed: return "The NFC reader did not finish closing. Close and reopen Arkade before trying again."
        }
    }
}
