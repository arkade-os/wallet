import CoreFoundation
import Foundation

enum WalletPolicyError: Error {
    case invalidSecret
    case invalidBackup
    case invalidName
}

enum WalletPolicy {
    static let secretLimit = 2_560
    static let backupLimit = 32 * 1_024 * 1_024

    static func validateSecretKey(_ key: String) throws {
        guard key == "encrypted_mnemonic" || key == "encrypted_private_key" else {
            throw WalletPolicyError.invalidSecret
        }
    }

    static func secretData(key: String, value: String) throws -> Data {
        try validateSecretKey(key)
        let data = Data(value.utf8)
        guard !data.isEmpty, data.count <= secretLimit else { throw WalletPolicyError.invalidSecret }
        return data
    }

    static func validateBackupName(_ name: String) throws {
        guard !name.isEmpty, name.utf8.count <= 128, !name.hasPrefix("."), name.hasSuffix(".json"),
              name.utf8.allSatisfy({ (48...57).contains($0) || (65...90).contains($0)
                  || (97...122).contains($0) || $0 == 45 || $0 == 95 || $0 == 46 }) else {
            throw WalletPolicyError.invalidName
        }
    }

    static func validateBackup(_ data: Data) throws -> String {
        guard data.count <= backupLimit, let contents = String(data: data, encoding: .utf8),
              let object = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              object.count == 7, object["format"] as? String == "arkade-native-state",
              integer(object["version"]) == 1, object["kdf"] as? String == "PBKDF2-SHA256",
              integer(object["iterations"]) == 600_000 else { throw WalletPolicyError.invalidBackup }
        for (name, size) in [("salt", 16), ("iv", 12), ("ciphertext", 0)] {
            guard let encoded = object[name] as? String, let decoded = Data(base64Encoded: encoded),
                  decoded.base64EncodedString() == encoded,
                  (size == 0 ? decoded.count >= 17 : decoded.count == size) else {
                throw WalletPolicyError.invalidBackup
            }
        }
        return contents
    }

    static func trustedOrigin(_ url: URL?, debug: Bool) -> Bool {
        guard let url = url, let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              components.user == nil, components.password == nil else { return false }
        let scheme = components.scheme?.lowercased()
        let host = components.host?.lowercased()
        if components.port == nil,
           (scheme == "tauri" && host == "localhost")
            || (["http", "https"].contains(scheme ?? "") && host == "tauri.localhost") { return true }
        return debug && scheme == "http" && components.port == 3002
            && ["localhost", "127.0.0.1"].contains(host ?? "")
    }

    static func allowedIntent(_ raw: String) -> Bool {
        guard !raw.isEmpty, raw.utf8.count <= 6_000,
              !raw.unicodeScalars.contains(where: { $0.value <= 32 || $0.value == 127 }),
              let decoded = raw.removingPercentEncoding,
              !decoded.unicodeScalars.contains(where: { $0.value < 32 || $0.value == 127 }),
              let components = URLComponents(string: raw), components.user == nil,
              components.password == nil, let scheme = components.scheme?.lowercased() else { return false }
        if scheme == "bitcoin" || scheme == "lightning" {
            guard let colon = raw.firstIndex(of: ":") else { return false }
            let payload = raw[raw.index(after: colon)...]
            return !payload.isEmpty && !payload.hasPrefix("/")
        }
        if scheme == "arkade" || scheme == "web+arkade" {
            return components.port == nil && ["send", "connect"].contains(components.host?.lowercased() ?? "")
        }
        return scheme == "https" && components.host?.lowercased() == "arkade.money"
            && (components.port == nil || components.port == 443)
            && (components.percentEncodedPath.isEmpty || components.percentEncodedPath == "/")
    }

    private static func integer(_ value: Any?) -> Int? {
        guard let number = value as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID(),
              !["f", "d"].contains(String(cString: number.objCType)) else { return nil }
        return number.intValue
    }
}
