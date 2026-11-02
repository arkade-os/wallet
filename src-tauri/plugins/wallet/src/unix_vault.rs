use super::{allowed_key, SECRET_LIMIT};
use keyring::{Entry, Error};
use std::sync::Mutex;
use zeroize::{Zeroize, Zeroizing};

const UNAVAILABLE: &str = "Secure storage unavailable";
static ACCESS: Mutex<()> = Mutex::new(());

fn unavailable(error: Error) -> String {
    if let Error::BadEncoding(mut value) = error {
        value.zeroize();
    }
    UNAVAILABLE.into()
}

fn service_name(namespace: &str, key: &str) -> Result<String, String> {
    allowed_key(key)?;
    if namespace.is_empty()
        || namespace.len() > 200
        || !namespace
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'-' | b'_'))
    {
        return Err("Invalid wallet secret namespace".into());
    }
    Ok(format!("ArkadeWallet:{namespace}"))
}

fn entry(namespace: &str, key: &str) -> Result<Entry, String> {
    let service = service_name(namespace, key)?;
    #[cfg(target_os = "macos")]
    let credential = keyring::macos::MacCredential::new_with_target(Some("user"), &service, key);
    #[cfg(target_os = "linux")]
    let credential = keyring::secret_service::SsCredential::new_with_target(None, &service, key);
    credential
        .map(|credential| Entry::new_with_credential(Box::new(credential)))
        .map_err(unavailable)
}

fn validate_secret(value: &[u8]) -> Result<&str, String> {
    if value.is_empty() || value.len() > SECRET_LIMIT {
        return Err("Invalid wallet secret size".into());
    }
    std::str::from_utf8(value).map_err(|_| "Invalid wallet secret encoding".into())
}

fn read_result(result: keyring::Result<Vec<u8>>) -> Result<Option<String>, String> {
    match result {
        Ok(value) => {
            let value = Zeroizing::new(value);
            validate_secret(&value)
                .map(|value| Some(value.to_owned()))
                .map_err(|_| UNAVAILABLE.to_owned())
        }
        Err(Error::NoEntry) => Ok(None),
        Err(error) => Err(unavailable(error)),
    }
}

fn delete_result(result: keyring::Result<()>) -> Result<(), String> {
    match result {
        Ok(()) | Err(Error::NoEntry) => Ok(()),
        Err(error) => Err(unavailable(error)),
    }
}

pub fn secret_get(namespace: &str, key: &str) -> Result<Option<String>, String> {
    let _access = ACCESS.lock().map_err(|_| UNAVAILABLE.to_owned())?;
    read_result(entry(namespace, key)?.get_secret())
}

pub fn secret_set(namespace: &str, key: &str, value: &[u8]) -> Result<(), String> {
    validate_secret(value)?;
    let _access = ACCESS.lock().map_err(|_| UNAVAILABLE.to_owned())?;
    entry(namespace, key)?
        .set_secret(value)
        .map_err(unavailable)
}

pub fn secret_remove(namespace: &str, key: &str) -> Result<(), String> {
    let _access = ACCESS.lock().map_err(|_| UNAVAILABLE.to_owned())?;
    delete_result(entry(namespace, key)?.delete_credential())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn entries_use_the_native_backend_and_exact_namespace_and_account() {
        for key in ["encrypted_mnemonic", "encrypted_private_key"] {
            let entry = entry("io.arkade.wallet.test.vault.fixture", key).unwrap();
            #[cfg(target_os = "linux")]
            {
                let credential = entry
                    .get_credential()
                    .downcast_ref::<keyring::secret_service::SsCredential>()
                    .unwrap();
                assert_eq!(
                    credential.attributes.get("service").map(String::as_str),
                    Some("ArkadeWallet:io.arkade.wallet.test.vault.fixture")
                );
                assert_eq!(
                    credential.attributes.get("username").map(String::as_str),
                    Some(key)
                );
                assert_eq!(
                    credential.attributes.get("target").map(String::as_str),
                    Some("default")
                );
            }
            #[cfg(target_os = "macos")]
            {
                let credential = entry
                    .get_credential()
                    .downcast_ref::<keyring::macos::MacCredential>()
                    .unwrap();
                assert_eq!(
                    credential.service,
                    "ArkadeWallet:io.arkade.wallet.test.vault.fixture"
                );
                assert_eq!(credential.account, key);
                assert_eq!(credential.domain, keyring::macos::MacKeychainDomain::User);
            }
        }
    }

    #[test]
    fn credential_names_bind_the_app_and_allowed_account() {
        assert_eq!(
            service_name("io.arkade.wallet.test", "encrypted_mnemonic"),
            Ok("ArkadeWallet:io.arkade.wallet.test".into())
        );
        assert_ne!(
            service_name("io.arkade.wallet", "encrypted_private_key"),
            service_name("io.arkade.wallet.test", "encrypted_private_key")
        );
        for key in ["", "password", "ENCRYPTED_MNEMONIC", "encrypted_mnemonic\0"] {
            assert_eq!(
                service_name("io.arkade.wallet.test", key),
                Err("Unsupported wallet secret".into())
            );
        }
    }

    #[test]
    fn invalid_namespaces_are_rejected_without_vault_access() {
        for namespace in ["", "a:b", "a/b", "a\0b", "a b", "é"] {
            assert!(service_name(namespace, "encrypted_mnemonic").is_err());
        }
        assert!(service_name(&"a".repeat(201), "encrypted_mnemonic").is_err());
        assert!(service_name(&"a".repeat(200), "encrypted_mnemonic").is_ok());
    }

    #[test]
    fn writes_validate_utf8_and_size_in_bytes() {
        assert!(validate_secret(&[]).is_err());
        assert!(validate_secret(&[0xff]).is_err());
        assert!(validate_secret(&vec![b'x'; SECRET_LIMIT]).is_ok());
        assert!(validate_secret(&vec![b'x'; SECRET_LIMIT + 1]).is_err());
        assert!(validate_secret("é".repeat(SECRET_LIMIT / 2).as_bytes()).is_ok());
        assert!(validate_secret("é".repeat(SECRET_LIMIT / 2 + 1).as_bytes()).is_err());
    }

    #[test]
    fn reads_preserve_values_and_reject_corruption() {
        assert_eq!(
            read_result(Ok(b"encrypted-test-fixture".to_vec())),
            Ok(Some("encrypted-test-fixture".into()))
        );
        for value in [vec![], vec![0xff], vec![b'x'; SECRET_LIMIT + 1]] {
            assert_eq!(read_result(Ok(value)), Err(UNAVAILABLE.into()));
        }
        assert_eq!(read_result(Err(Error::NoEntry)), Ok(None));
    }

    #[test]
    fn vault_errors_do_not_expose_backend_details_or_become_missing_values() {
        for error in [
            Error::PlatformFailure(Box::new(std::io::Error::other("private backend detail"))),
            Error::NoStorageAccess(Box::new(std::io::Error::other("locked collection detail"))),
            Error::BadEncoding(b"private corrupt value".to_vec()),
            Error::Ambiguous(vec![]),
        ] {
            assert_eq!(read_result(Err(error)), Err(UNAVAILABLE.into()));
        }
    }

    #[test]
    fn removal_is_idempotent_but_locked_vault_is_an_error() {
        assert_eq!(delete_result(Ok(())), Ok(()));
        assert_eq!(delete_result(Err(Error::NoEntry)), Ok(()));
        assert_eq!(
            delete_result(Err(Error::NoStorageAccess(Box::new(
                std::io::Error::other("locked collection detail")
            )))),
            Err(UNAVAILABLE.into())
        );
    }
}
