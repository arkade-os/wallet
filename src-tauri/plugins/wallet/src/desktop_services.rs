use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;
use tauri::{AppHandle, Runtime, WebviewWindow};
use tauri_plugin_clipboard_manager::ClipboardExt;

const CLIPBOARD_LIMIT: usize = 1_000_000;

fn validate_clipboard_text(text: &str) -> Result<(), String> {
    if text.len() > CLIPBOARD_LIMIT || text.contains('\0') {
        return Err("Invalid clipboard text".into());
    }
    Ok(())
}

// Linux clipboard reads must run off the UI thread to avoid a WebView ownership deadlock.
pub fn clipboard_read<R: Runtime>(app: &AppHandle<R>) -> Result<String, String> {
    let text = app
        .clipboard()
        .read_text()
        .map_err(|_| "Clipboard unavailable".to_owned())?;
    validate_clipboard_text(&text)?;
    Ok(text)
}

pub fn clipboard_write<R: Runtime>(app: &AppHandle<R>, text: &str) -> Result<(), String> {
    validate_clipboard_text(text)?;
    app.clipboard()
        .write_secret(text)
        .map_err(|_| "Clipboard unavailable".into())
}

pub fn export_backup<R: Runtime>(
    window: &WebviewWindow<R>,
    contents: &str,
    file_name: &str,
) -> Result<(), String> {
    super::backup::validate(contents)?;
    super::backup::validate_name(file_name)?;
    let destination = rfd::FileDialog::new()
        .set_parent(window)
        .set_title("Save encrypted Arkade backup")
        .add_filter("Encrypted Arkade backup", &["json"])
        .set_file_name(file_name)
        .save_file()
        .ok_or("USER_CANCELLED")?;
    write_backup_file(&destination, contents)
}

pub fn import_backup<R: Runtime>(window: &WebviewWindow<R>) -> Result<String, String> {
    let source = rfd::FileDialog::new()
        .set_parent(window)
        .set_title("Open encrypted Arkade backup")
        .add_filter("Encrypted Arkade backup", &["json"])
        .pick_file()
        .ok_or("USER_CANCELLED")?;
    read_backup_file(&source)
}

fn write_backup_file(destination: &Path, contents: &str) -> Result<(), String> {
    super::backup::validate(contents)?;
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
    #[cfg(unix)]
    File::open(directory)
        .and_then(|directory| directory.sync_all())
        .map_err(|_| "Backup write failed")?;
    Ok(())
}

fn read_backup_file(source: &Path) -> Result<String, String> {
    let mut input = File::open(source)
        .map_err(|_| "Backup file unavailable")?
        .take(super::backup::MAX_BYTES as u64 + 1);
    let mut contents = String::new();
    input
        .read_to_string(&mut contents)
        .map_err(|_| "Backup must be UTF-8 JSON")?;
    if contents.len() > super::backup::MAX_BYTES {
        return Err("Backup file is too large".into());
    }
    super::backup::validate(&contents)?;
    Ok(contents)
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::{engine::general_purpose::STANDARD, Engine};
    use serde_json::json;

    fn envelope(byte: u8) -> String {
        json!({ "format":"arkade-native-state", "version":1, "kdf":"PBKDF2-SHA256", "iterations":600000,
            "salt": STANDARD.encode([0;16]), "iv": STANDARD.encode([1;12]), "ciphertext": STANDARD.encode([byte;17]) }).to_string()
    }

    #[test]
    fn validated_backups_round_trip_and_replace_atomically() {
        let directory = tempfile::tempdir().unwrap();
        let destination = directory.path().join("wallet.json");
        write_backup_file(&destination, &envelope(2)).unwrap();
        assert_eq!(read_backup_file(&destination).unwrap(), envelope(2));
        write_backup_file(&destination, &envelope(3)).unwrap();
        assert_eq!(read_backup_file(&destination).unwrap(), envelope(3));
        assert_eq!(std::fs::read_dir(directory.path()).unwrap().count(), 1);
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            assert_eq!(
                std::fs::metadata(&destination)
                    .unwrap()
                    .permissions()
                    .mode()
                    & 0o777,
                0o600
            );
        }
    }

    #[test]
    fn invalid_exports_leave_the_previous_backup_untouched() {
        let directory = tempfile::tempdir().unwrap();
        let destination = directory.path().join("wallet.json");
        std::fs::write(&destination, envelope(2)).unwrap();
        assert!(write_backup_file(&destination, r#"{"mnemonic":"plaintext"}"#).is_err());
        assert_eq!(std::fs::read_to_string(&destination).unwrap(), envelope(2));
        assert_eq!(std::fs::read_dir(directory.path()).unwrap().count(), 1);
    }

    #[test]
    fn failed_persistence_does_not_leave_a_temporary_file() {
        let directory = tempfile::tempdir().unwrap();
        let destination = directory.path().join("existing-directory");
        std::fs::create_dir(&destination).unwrap();
        assert!(write_backup_file(&destination, &envelope(2)).is_err());
        assert!(destination.is_dir());
        assert_eq!(std::fs::read_dir(directory.path()).unwrap().count(), 1);
    }

    #[test]
    fn imports_reject_invalid_utf8_plaintext_and_oversized_files() {
        let directory = tempfile::tempdir().unwrap();
        let source = directory.path().join("wallet.json");
        std::fs::write(&source, [0xff, 0xfe]).unwrap();
        assert_eq!(
            read_backup_file(&source).unwrap_err(),
            "Backup must be UTF-8 JSON"
        );
        std::fs::write(&source, r#"{"mnemonic":"plaintext"}"#).unwrap();
        assert!(read_backup_file(&source).is_err());
        File::create(&source)
            .unwrap()
            .set_len(super::super::backup::MAX_BYTES as u64 + 1)
            .unwrap();
        assert_eq!(
            read_backup_file(&source).unwrap_err(),
            "Backup file is too large"
        );
    }

    #[test]
    fn clipboard_validation_is_bounded_without_accessing_the_system_clipboard() {
        assert!(validate_clipboard_text("").is_ok());
        assert!(validate_clipboard_text("bitcoin:public-request").is_ok());
        assert!(validate_clipboard_text("unsafe\0text").is_err());
        assert!(validate_clipboard_text(&"a".repeat(CLIPBOARD_LIMIT)).is_ok());
        assert!(validate_clipboard_text(&"é".repeat(CLIPBOARD_LIMIT / 2 + 1)).is_err());
    }
}
