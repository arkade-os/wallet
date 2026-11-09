import Foundation
import XCTest
@testable import tauri_plugin_wallet

final class WalletPolicyTests: XCTestCase {
    private func envelope() -> [String: Any] {
        ["format": "arkade-native-state", "version": 1, "kdf": "PBKDF2-SHA256", "iterations": 600_000,
         "salt": Data(repeating: 0, count: 16).base64EncodedString(),
         "iv": Data(repeating: 1, count: 12).base64EncodedString(),
         "ciphertext": Data(repeating: 2, count: 17).base64EncodedString()]
    }

    private func encoded(_ value: [String: Any]) throws -> Data {
        try JSONSerialization.data(withJSONObject: value, options: [.sortedKeys])
    }

    func testOnlyOpaqueEncryptedWalletSlotsAreAcceptedWithByteLimits() throws {
        for key in ["encrypted_mnemonic", "encrypted_private_key"] {
            XCTAssertEqual(try WalletPolicy.secretData(key: key, value: "encrypted").count, 9)
        }
        XCTAssertThrowsError(try WalletPolicy.secretData(key: "mnemonic", value: "test"))
        XCTAssertThrowsError(try WalletPolicy.secretData(key: "encrypted_mnemonic", value: ""))
        let boundary = String(repeating: "🦊", count: 640)
        XCTAssertEqual(try WalletPolicy.secretData(key: "encrypted_mnemonic", value: boundary).count, 2_560)
        XCTAssertThrowsError(try WalletPolicy.secretData(key: "encrypted_mnemonic", value: boundary + "a"))
    }

    func testEncryptedBackupRoundTripAndRejectsPlaintextOrAdditionalFields() throws {
        let data = try encoded(envelope())
        XCTAssertEqual(try WalletPolicy.validateBackup(data), String(data: data, encoding: .utf8))
        XCTAssertThrowsError(try WalletPolicy.validateBackup(Data("{\"mnemonic\":\"test\"}".utf8)))
        var extra = envelope()
        extra["mnemonic"] = "plaintext"
        XCTAssertThrowsError(try WalletPolicy.validateBackup(encoded(extra)))
        XCTAssertThrowsError(try WalletPolicy.validateBackup(Data([0xff, 0xfe])))
        XCTAssertThrowsError(try WalletPolicy.validateBackup(Data(repeating: 32, count: WalletPolicy.backupLimit + 1)))
    }

    func testBackupRequiresExactVersionKdfAndCryptographicFieldSizes() throws {
        let invalidFields: [(String, Any)] = [
            ("version", true), ("version", 2), ("version", "1"),
            ("iterations", 1), ("iterations", false), ("kdf", "PBKDF2-SHA1"),
            ("format", "other"), ("salt", "not-base64"),
            ("salt", Data(repeating: 0, count: 15).base64EncodedString()),
            ("iv", Data(repeating: 0, count: 16).base64EncodedString()),
            ("ciphertext", Data(repeating: 0, count: 16).base64EncodedString()),
        ]
        for (field, invalid) in invalidFields {
            var value = envelope()
            value[field] = invalid
            XCTAssertThrowsError(try WalletPolicy.validateBackup(encoded(value)), field)
        }
        let floatingVersion = String(data: try encoded(envelope()), encoding: .utf8)!
            .replacingOccurrences(of: "\"version\":1", with: "\"version\":1.0")
        XCTAssertThrowsError(try WalletPolicy.validateBackup(Data(floatingVersion.utf8)))
    }

    func testFileNameCannotEscapePrivateExportDirectory() throws {
        XCTAssertNoThrow(try WalletPolicy.validateBackupName("arkade-state-2026-10-31.json"))
        for value in ["../state.json", "/state.json", "C:\\state.json", ".hidden.json", "wallet\0.json",
                      "state.txt", "récovery.json", String(repeating: "a", count: 124) + ".json"] {
            XCTAssertThrowsError(try WalletPolicy.validateBackupName(value), value)
        }
    }

    func testNativeAuthorityOnlyAvailableToBundledOrigin() {
        for raw in ["tauri://localhost/", "https://tauri.localhost/", "http://tauri.localhost/"] {
            XCTAssertTrue(WalletPolicy.trustedOrigin(URL(string: raw), debug: false), raw)
        }
        for raw in ["https://arkade.money/", "tauri://localhost:3002/", "tauri://user@localhost/",
                    "https://tauri.localhost.evil/", "http://127.0.0.1:3002/", "http://localhost:3002/"] {
            XCTAssertFalse(WalletPolicy.trustedOrigin(URL(string: raw), debug: false), raw)
        }
        XCTAssertTrue(WalletPolicy.trustedOrigin(URL(string: "http://127.0.0.1:3002/"), debug: true))
        XCTAssertFalse(WalletPolicy.trustedOrigin(URL(string: "http://127.0.0.1:3003/"), debug: true))
        XCTAssertFalse(WalletPolicy.trustedOrigin(nil, debug: true))
    }

    func testOnlyWalletPaymentOrConnectionLinksAreAccepted() {
        for raw in ["bitcoin:bc1qexample?amount=0.001", "lightning:lnbcexample", "arkade://send?to=test",
                    "web+arkade://connect?uri=test", "https://arkade.money/?lightning=lnbcexample"] {
            XCTAssertTrue(WalletPolicy.allowedIntent(raw), raw)
        }
        for raw in ["bitcoin:", "bitcoin://example", "lightning:/example", "javascript:alert(1)",
                    "arkade://user@send", "arkade://send:1234", "arkade://settings", "https://evil.example/",
                    "https://arkade.money/login", "https://arkade.money:444/", "bitcoin:abc%0Adef",
                    "bitcoin:abc\ndef", "bitcoin:abc%GG", "bitcoin:" + String(repeating: "a", count: 6_000)] {
            XCTAssertFalse(WalletPolicy.allowedIntent(raw), raw)
        }
    }
}
