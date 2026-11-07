import Foundation
import Security
import XCTest
@testable import tauri_plugin_wallet

final class KeychainVaultTests: XCTestCase {
    func testIsolatedVaultPersistsUpdatesAndRemovesDeviceOnlyCiphertext() throws {
        let service = "io.arkade.wallet.tests." + UUID().uuidString
        let vault = try KeychainVault(service: service)
        let key = "encrypted_mnemonic"
        defer { try? vault.remove(key) }
        XCTAssertNil(try vault.get(key))
        try vault.set(key, value: "encrypted-test-one")
        XCTAssertEqual(try KeychainVault(service: service).get(key), "encrypted-test-one")
        try vault.set(key, value: "encrypted-test-two")
        XCTAssertEqual(try vault.get(key), "encrypted-test-two")

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service + ".wallet-secrets",
            kSecAttrAccount as String: key,
            kSecAttrSynchronizable as String: false,
            kSecReturnAttributes as String: true,
        ]
        var attributes: CFTypeRef?
        XCTAssertEqual(SecItemCopyMatching(query as CFDictionary, &attributes), errSecSuccess)
        let result = try XCTUnwrap(attributes as? [String: Any])
        XCTAssertEqual(result[kSecAttrAccessible as String] as? String,
                       kSecAttrAccessibleWhenUnlockedThisDeviceOnly as String)
        var synchronized = query
        synchronized[kSecAttrSynchronizable as String] = true
        XCTAssertEqual(SecItemCopyMatching(synchronized as CFDictionary, nil), errSecItemNotFound)
        try vault.remove(key)
        XCTAssertNil(try vault.get(key))
        XCTAssertNoThrow(try vault.remove(key))
    }

    func testRejectedKeysAndSizesNeverCreateItems() throws {
        let vault = try KeychainVault(service: "io.arkade.wallet.tests." + UUID().uuidString)
        XCTAssertThrowsError(try vault.set("plaintext", value: "must-not-persist"))
        XCTAssertThrowsError(try vault.get("plaintext"))
        XCTAssertThrowsError(try vault.remove("plaintext"))
        XCTAssertThrowsError(try vault.set("encrypted_private_key", value: String(repeating: "a", count: 2_561)))
        XCTAssertNil(try vault.get("encrypted_private_key"))
    }

    func testUnexpectedProtectionFailsClosedWithoutDeletingTheExistingItem() throws {
        let service = "io.arkade.wallet.tests." + UUID().uuidString
        let vault = try KeychainVault(service: service)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service + ".wallet-secrets",
            kSecAttrAccount as String: "encrypted_mnemonic",
            kSecAttrSynchronizable as String: false,
        ]
        var item = query
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        item[kSecValueData as String] = Data("encrypted-test".utf8)
        XCTAssertEqual(SecItemAdd(item as CFDictionary, nil), errSecSuccess)
        defer { SecItemDelete(query as CFDictionary) }
        XCTAssertThrowsError(try vault.get("encrypted_mnemonic"))
        XCTAssertEqual(SecItemCopyMatching(query as CFDictionary, nil), errSecSuccess)
    }
}
