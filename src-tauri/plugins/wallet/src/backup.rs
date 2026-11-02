use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::Value;

pub const MAX_BYTES: usize = 32 * 1024 * 1024;

pub fn validate(contents: &str) -> Result<(), String> {
    let invalid = || "Invalid encrypted Arkade backup".to_owned();
    if contents.len() > MAX_BYTES {
        return Err(invalid());
    }
    let parsed: Value = serde_json::from_str(contents).map_err(|_| invalid())?;
    let object = parsed.as_object().ok_or_else(invalid)?;
    if object.len() != 7
        || parsed["format"] != "arkade-native-state"
        || parsed["version"] != 1
        || parsed["kdf"] != "PBKDF2-SHA256"
        || parsed["iterations"] != 600_000
    {
        return Err(invalid());
    }
    for (name, required) in [("salt", Some(16)), ("iv", Some(12)), ("ciphertext", None)] {
        let value = parsed[name].as_str().ok_or_else(invalid)?;
        let decoded = STANDARD.decode(value).map_err(|_| invalid())?;
        if required.is_some_and(|size| decoded.len() != size)
            || (name == "ciphertext" && decoded.len() < 17)
        {
            return Err(invalid());
        }
    }
    Ok(())
}

pub fn validate_name(name: &str) -> Result<(), String> {
    if name.is_empty()
        || name.len() > 128
        || name.starts_with('.')
        || !name.ends_with(".json")
        || !name
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.'))
    {
        return Err("Invalid backup file name".into());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn envelope() -> Value {
        json!({ "format":"arkade-native-state", "version":1, "kdf":"PBKDF2-SHA256", "iterations":600000,
            "salt": STANDARD.encode([0;16]), "iv": STANDARD.encode([1;12]), "ciphertext": STANDARD.encode([2;17]) })
    }

    #[test]
    fn only_versioned_encrypted_envelopes_are_accepted() {
        assert!(validate(&envelope().to_string()).is_ok());
        assert!(validate(r#"{"mnemonic":"plaintext must not be exported"}"#).is_err());
        for (field, value) in [
            ("version", json!(2)),
            ("iterations", json!(1)),
            ("salt", json!("abcd")),
            ("iv", json!(STANDARD.encode([0; 16]))),
            ("ciphertext", json!(STANDARD.encode([0; 16]))),
        ] {
            let mut envelope = envelope();
            envelope[field] = value;
            assert!(validate(&envelope.to_string()).is_err());
        }
        let mut extra = envelope();
        extra["mnemonic"] = json!("plaintext");
        assert!(validate(&extra.to_string()).is_err());
    }

    #[test]
    fn file_names_cannot_be_paths() {
        assert!(validate_name("arkade-state-2026-10-30.json").is_ok());
        for name in [
            "../state.json",
            "C:\\state.json",
            ".hidden.json",
            "state.txt",
            "wallet\0.json",
        ] {
            assert!(validate_name(name).is_err());
        }
    }
}
