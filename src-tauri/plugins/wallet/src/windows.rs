use std::io::{Read, Write};
use std::{ptr, slice};
use windows_sys::Win32::{
    Foundation::{GetLastError, GlobalFree, ERROR_NOT_FOUND, HWND},
    Security::Credentials::{
        CredDeleteW, CredFree, CredReadW, CredWriteW, CREDENTIALW, CRED_PERSIST_LOCAL_MACHINE,
        CRED_TYPE_GENERIC,
    },
    System::{
        DataExchange::{
            CloseClipboard, EmptyClipboard, GetClipboardData, OpenClipboard, SetClipboardData,
        },
        Memory::{GlobalAlloc, GlobalLock, GlobalSize, GlobalUnlock, GMEM_MOVEABLE},
    },
};
use zeroize::Zeroizing;
use super::allowed_key;

const UNAVAILABLE: &str = "Secure storage unavailable";

fn target(namespace: &str, key: &str) -> Vec<u16> {
    format!("ArkadeWallet:{namespace}:{key}\0")
        .encode_utf16()
        .collect()
}

pub fn secret_get(namespace: &str, key: &str) -> Result<Option<String>, String> {
    allowed_key(key)?;
    let target = target(namespace, key);
    let mut credential: *mut CREDENTIALW = ptr::null_mut();
    unsafe {
        if CredReadW(target.as_ptr(), CRED_TYPE_GENERIC, 0, &mut credential) == 0 {
            return if GetLastError() == ERROR_NOT_FOUND {
                Ok(None)
            } else {
                Err(UNAVAILABLE.into())
            };
        }
        let stored = &*credential;
        let result = if stored.CredentialBlobSize as usize <= super::SECRET_LIMIT
            && !stored.CredentialBlob.is_null()
        {
            String::from_utf8(
                slice::from_raw_parts(stored.CredentialBlob, stored.CredentialBlobSize as usize)
                    .to_vec(),
            )
            .map(Some)
            .map_err(|_| UNAVAILABLE.into())
        } else {
            Err(UNAVAILABLE.into())
        };
        if !stored.CredentialBlob.is_null() {
            ptr::write_bytes(stored.CredentialBlob, 0, stored.CredentialBlobSize as usize);
        }
        CredFree(credential.cast());
        result
    }
}

pub fn secret_set(namespace: &str, key: &str, value: &[u8]) -> Result<(), String> {
    allowed_key(key)?;
    if value.is_empty() || value.len() > super::SECRET_LIMIT {
        return Err("Invalid wallet secret size".into());
    }
    let mut target = target(namespace, key);
    let mut value = Zeroizing::new(value.to_vec());
    let mut user = [0u16];
    let credential = CREDENTIALW {
        Type: CRED_TYPE_GENERIC,
        TargetName: target.as_mut_ptr(),
        CredentialBlobSize: value.len() as u32,
        CredentialBlob: value.as_mut_ptr(),
        Persist: CRED_PERSIST_LOCAL_MACHINE,
        UserName: user.as_mut_ptr(),
        ..Default::default()
    };
    if unsafe { CredWriteW(&credential, 0) } == 0 {
        return Err(UNAVAILABLE.into());
    }
    Ok(())
}

pub fn secret_remove(namespace: &str, key: &str) -> Result<(), String> {
    allowed_key(key)?;
    let target = target(namespace, key);
    if unsafe { CredDeleteW(target.as_ptr(), CRED_TYPE_GENERIC, 0) } == 0
        && unsafe { GetLastError() } != ERROR_NOT_FOUND
    {
        return Err(UNAVAILABLE.into());
    }
    Ok(())
}

struct Clipboard;
impl Drop for Clipboard {
    fn drop(&mut self) {
        unsafe {
            CloseClipboard();
        }
    }
}

pub fn clipboard_read() -> Result<String, String> {
    unsafe {
        if OpenClipboard(ptr::null_mut()) == 0 {
            return Err("Clipboard unavailable".into());
        }
        let _clipboard = Clipboard;
        let data = GetClipboardData(13);
        if data.is_null() {
            return Ok(String::new());
        }
        let size = GlobalSize(data) / 2;
        if size > 1_000_000 {
            return Err("Clipboard text is too large".into());
        }
        let content = GlobalLock(data).cast::<u16>();
        if content.is_null() {
            return Err("Clipboard unavailable".into());
        }
        let bytes = slice::from_raw_parts(content, size);
        let end = bytes.iter().position(|unit| *unit == 0).unwrap_or(size);
        let result = String::from_utf16(&bytes[..end]).map_err(|_| "Invalid clipboard text".into());
        GlobalUnlock(data);
        result
    }
}

pub fn clipboard_write(window: HWND, text: &str) -> Result<(), String> {
    let text = text.encode_utf16().chain(Some(0)).collect::<Vec<_>>();
    unsafe {
        if OpenClipboard(window) == 0 {
            return Err("Clipboard unavailable".into());
        }
        let _clipboard = Clipboard;
        let memory = GlobalAlloc(GMEM_MOVEABLE, text.len() * 2);
        if memory.is_null() {
            return Err("Clipboard unavailable".into());
        }
        let destination = GlobalLock(memory).cast::<u16>();
        if destination.is_null() {
            GlobalFree(memory);
            return Err("Clipboard unavailable".into());
        }
        ptr::copy_nonoverlapping(text.as_ptr(), destination, text.len());
        GlobalUnlock(memory);
        if EmptyClipboard() == 0 || SetClipboardData(13, memory).is_null() {
            GlobalFree(memory);
            return Err("Clipboard unavailable".into());
        }
        Ok(())
    }
}

pub fn export_backup<R: tauri::Runtime>(
    window: &tauri::WebviewWindow<R>,
    contents: &str,
    file_name: &str,
) -> Result<(), String> {
    let destination = rfd::FileDialog::new()
        .set_parent(window)
        .set_title("Save encrypted Arkade backup")
        .add_filter("Encrypted Arkade backup", &["json"])
        .set_file_name(file_name)
        .save_file()
        .ok_or("USER_CANCELLED")?;
    let directory = destination
        .parent()
        .ok_or("Backup destination unavailable")?;
    let mut temporary =
        tempfile::NamedTempFile::new_in(directory).map_err(|_| "Backup destination unavailable")?;
    temporary
        .write_all(contents.as_bytes())
        .map_err(|_| "Backup write failed")?;
    temporary
        .as_file()
        .sync_all()
        .map_err(|_| "Backup write failed")?;
    temporary
        .persist(destination)
        .map_err(|_| "Backup write failed")?;
    Ok(())
}

pub fn import_backup<R: tauri::Runtime>(
    window: &tauri::WebviewWindow<R>,
) -> Result<String, String> {
    let source = rfd::FileDialog::new()
        .set_parent(window)
        .set_title("Open encrypted Arkade backup")
        .add_filter("Encrypted Arkade backup", &["json"])
        .pick_file()
        .ok_or("USER_CANCELLED")?;
    let mut input = std::fs::File::open(source)
        .map_err(|_| "Backup file unavailable")?
        .take(super::backup::MAX_BYTES as u64 + 1);
    let mut contents = String::new();
    input
        .read_to_string(&mut contents)
        .map_err(|_| "Backup must be UTF-8 JSON")?;
    if contents.len() > super::backup::MAX_BYTES {
        return Err("Backup file is too large".into());
    }
    Ok(contents)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn windows_credentials_round_trip_replace_and_remove() {
        let namespace = format!(
            "native-plugin-test-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        );
        let key = "encrypted_mnemonic";
        assert_eq!(secret_get(&namespace, key).unwrap(), None);
        secret_set(&namespace, key, b"test-encrypted-ciphertext").unwrap();
        assert_eq!(
            secret_get(&namespace, key).unwrap().as_deref(),
            Some("test-encrypted-ciphertext")
        );
        assert!(secret_set(&namespace, key, &vec![0; super::super::SECRET_LIMIT + 1]).is_err());
        assert_eq!(
            secret_get(&namespace, key).unwrap().as_deref(),
            Some("test-encrypted-ciphertext")
        );
        secret_set(&namespace, key, b"replacement-ciphertext").unwrap();
        assert_eq!(
            secret_get(&namespace, key).unwrap().as_deref(),
            Some("replacement-ciphertext")
        );
        secret_remove(&namespace, key).unwrap();
        assert_eq!(secret_get(&namespace, key).unwrap(), None);
        secret_remove(&namespace, key).unwrap();
    }

    #[test]
    fn windows_credentials_reject_unsupported_keys_before_access() {
        let namespace = format!("native-plugin-test-invalid-{}", std::process::id());
        for key in ["", "password", "ENCRYPTED_MNEMONIC", "encrypted_mnemonic\0"] {
            assert_eq!(secret_get(&namespace, key), Err("Unsupported wallet secret".into()));
            assert_eq!(secret_set(&namespace, key, b"not-seen"), Err("Unsupported wallet secret".into()));
            assert_eq!(secret_remove(&namespace, key), Err("Unsupported wallet secret".into()));
        }
    }
}
