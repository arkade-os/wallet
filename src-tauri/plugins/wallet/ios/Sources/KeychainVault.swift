import Foundation
import Security

enum KeychainVaultError: Error {
    case unavailable
}

final class KeychainVault {
    private let service: String

    init(service: String) throws {
        guard !service.isEmpty, service.utf8.count <= 200 else { throw KeychainVaultError.unavailable }
        self.service = service + ".wallet-secrets"
    }

    func get(_ key: String) throws -> String? {
        var query = try itemQuery(key)
        query[kSecReturnData as String] = true
        query[kSecReturnAttributes as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let item = result as? [String: Any],
              item[kSecAttrAccessible as String] as? String == kSecAttrAccessibleWhenUnlockedThisDeviceOnly as String,
              let data = item[kSecValueData as String] as? Data,
              !data.isEmpty, data.count <= WalletPolicy.secretLimit,
              let value = String(data: data, encoding: .utf8) else { throw KeychainVaultError.unavailable }
        return value
    }

    func set(_ key: String, value: String) throws {
        let data = try WalletPolicy.secretData(key: key, value: value)
        let query = try itemQuery(key)
        let attributes: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        ]
        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            var item = query
            attributes.forEach { item[$0.key] = $0.value }
            guard SecItemAdd(item as CFDictionary, nil) == errSecSuccess else { throw KeychainVaultError.unavailable }
        } else if status != errSecSuccess { throw KeychainVaultError.unavailable }
    }

    func remove(_ key: String) throws {
        let status = SecItemDelete(try itemQuery(key) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else { throw KeychainVaultError.unavailable }
    }

    private func itemQuery(_ key: String) throws -> [String: Any] {
        try WalletPolicy.validateSecretKey(key)
        return [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecAttrSynchronizable as String: false,
        ]
    }
}
