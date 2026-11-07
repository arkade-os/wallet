use serde_json::{json, Value};
use tauri::Manager;
#[cfg(desktop)]
use tauri::Emitter;
use tauri::{plugin::TauriPlugin, AppHandle, Runtime, WebviewWindow};
use zeroize::Zeroizing;
mod backup;
#[cfg(desktop)]
mod desktop_intents;

#[cfg(any(target_os = "macos", target_os = "linux"))]
mod desktop_services;
#[cfg(any(target_os = "macos", target_os = "linux"))]
mod unix_vault;
#[cfg(windows)]
mod windows;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_wallet);

pub const SECRET_LIMIT: usize = 2560;

#[cfg(any(target_os = "android", target_os = "ios"))]
struct Mobile<R: Runtime>(tauri::plugin::PluginHandle<R>);

fn allowed_key(key: &str) -> Result<(), String> {
    match key {
        "encrypted_mnemonic" | "encrypted_private_key" => Ok(()),
        _ => Err("Unsupported wallet secret".into()),
    }
}

pub fn is_local_url(url: &tauri::Url) -> bool {
    if !url.username().is_empty() || url.password().is_some() {
        return false;
    }
    let app = url.port().is_none()
        && ((url.scheme() == "tauri" && url.host_str() == Some("localhost"))
            || (matches!(url.scheme(), "http" | "https")
                && url.host_str() == Some("tauri.localhost")));
    app || (cfg!(debug_assertions)
        && url.scheme() == "http"
        && matches!(url.host_str(), Some("localhost" | "127.0.0.1"))
        && url.port() == Some(3002))
}

fn require_window<R: Runtime>(window: &WebviewWindow<R>) -> Result<(), String> {
    let url = window.url().map_err(|_| "Invalid wallet window")?;
    if window.label() != "main" || !is_local_url(&url) {
        return Err("Native access is restricted to the bundled wallet".into());
    }
    Ok(())
}

#[cfg(any(target_os = "android", target_os = "ios"))]
fn mobile<R: Runtime>(_app: &AppHandle<R>, method: &str, args: Value) -> Result<Value, String> {
    _app.state::<Mobile<R>>()
        .0
        .run_mobile_plugin(method, args)
        .map_err(|error| match error {
            tauri::plugin::mobile::PluginInvokeError::InvokeRejected(response)
                if response.code.as_deref() == Some("USER_CANCELLED") =>
            {
                "USER_CANCELLED".into()
            }
            _ => "Native wallet operation unavailable".into(),
        })
}

#[tauri::command]
async fn secret_get<R: Runtime>(
    _app: AppHandle<R>,
    window: WebviewWindow<R>,
    key: String,
) -> Result<Option<String>, String> {
    require_window(&window)?;
    allowed_key(&key)?;
    #[cfg(windows)]
    return windows::secret_get(&_app.config().identifier, &key);
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    return tauri::async_runtime::spawn_blocking(move || {
        unix_vault::secret_get(&_app.config().identifier, &key)
    })
    .await
    .map_err(|_| "Secure storage unavailable".to_owned())?;
    #[cfg(any(target_os = "android", target_os = "ios"))]
    return match mobile(&_app, "secretGet", json!({ "key": key }))?.get("value") {
        Some(Value::String(value)) => Ok(Some(value.clone())),
        Some(Value::Null) => Ok(None),
        _ => Err("Secure storage unavailable".into()),
    };
    #[cfg(not(any(
        windows,
        target_os = "android",
        target_os = "ios",
        target_os = "macos",
        target_os = "linux"
    )))]
    Err("Secure storage is unavailable on this platform".into())
}

#[tauri::command]
async fn secret_set<R: Runtime>(
    _app: AppHandle<R>,
    window: WebviewWindow<R>,
    key: String,
    value: String,
) -> Result<(), String> {
    let value = Zeroizing::new(value);
    require_window(&window)?;
    allowed_key(&key)?;
    if value.is_empty() || value.len() > SECRET_LIMIT {
        return Err("Invalid wallet secret size".into());
    }
    #[cfg(windows)]
    return windows::secret_set(&_app.config().identifier, &key, value.as_bytes());
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    return tauri::async_runtime::spawn_blocking(move || {
        unix_vault::secret_set(&_app.config().identifier, &key, value.as_bytes())
    })
    .await
    .map_err(|_| "Secure storage unavailable".to_owned())?;
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        mobile(&_app, "secretSet", json!({ "key": key, "value": &*value }))?;
        Ok(())
    }
    #[cfg(not(any(
        windows,
        target_os = "android",
        target_os = "ios",
        target_os = "macos",
        target_os = "linux"
    )))]
    Err("Secure storage is unavailable on this platform".into())
}

#[tauri::command]
async fn secret_remove<R: Runtime>(
    _app: AppHandle<R>,
    window: WebviewWindow<R>,
    key: String,
) -> Result<(), String> {
    require_window(&window)?;
    allowed_key(&key)?;
    #[cfg(windows)]
    return windows::secret_remove(&_app.config().identifier, &key);
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    return tauri::async_runtime::spawn_blocking(move || {
        unix_vault::secret_remove(&_app.config().identifier, &key)
    })
    .await
    .map_err(|_| "Secure storage unavailable".to_owned())?;
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        mobile(&_app, "secretRemove", json!({ "key": key }))?;
        Ok(())
    }
    #[cfg(not(any(
        windows,
        target_os = "android",
        target_os = "ios",
        target_os = "macos",
        target_os = "linux"
    )))]
    Err("Secure storage is unavailable on this platform".into())
}

#[tauri::command]
async fn clipboard_read<R: Runtime>(
    _app: AppHandle<R>,
    window: WebviewWindow<R>,
) -> Result<String, String> {
    require_window(&window)?;
    #[cfg(windows)]
    return windows::clipboard_read();
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    return tauri::async_runtime::spawn_blocking(move || desktop_services::clipboard_read(&_app))
        .await
        .map_err(|_| "Clipboard unavailable".to_owned())?;
    #[cfg(any(target_os = "android", target_os = "ios"))]
    return mobile(&_app, "clipboardRead", json!({}))?
        .get("text")
        .and_then(Value::as_str)
        .map(str::to_owned)
        .ok_or_else(|| "Clipboard unavailable".into());
    #[cfg(not(any(
        windows,
        target_os = "android",
        target_os = "ios",
        target_os = "macos",
        target_os = "linux"
    )))]
    Err("Native clipboard unavailable".into())
}

#[tauri::command]
async fn clipboard_write<R: Runtime>(
    _app: AppHandle<R>,
    window: WebviewWindow<R>,
    text: String,
) -> Result<(), String> {
    require_window(&window)?;
    if text.len() > 1_000_000 || text.contains('\0') {
        return Err("Invalid clipboard text".into());
    }
    #[cfg(windows)]
    return windows::clipboard_write(
        window.hwnd().map_err(|_| "Wallet window unavailable")?.0,
        &text,
    );
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    return tauri::async_runtime::spawn_blocking(move || {
        desktop_services::clipboard_write(&_app, &text)
    })
    .await
    .map_err(|_| "Clipboard unavailable".to_owned())?;
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        mobile(&_app, "clipboardWrite", json!({ "text": text }))?;
        Ok(())
    }
    #[cfg(not(any(
        windows,
        target_os = "android",
        target_os = "ios",
        target_os = "macos",
        target_os = "linux"
    )))]
    Err("Native clipboard unavailable".into())
}

#[tauri::command]
async fn share_text<R: Runtime>(
    _app: AppHandle<R>,
    window: WebviewWindow<R>,
    text: String,
    title: Option<String>,
) -> Result<(), String> {
    require_window(&window)?;
    if text.len() > 64_000 || title.as_ref().is_some_and(|title| title.len() > 200) {
        return Err("Invalid share content".into());
    }
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        mobile(&_app, "shareText", json!({ "text": text, "title": title }))?;
        Ok(())
    }
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    Err("Native sharing is unavailable on this platform".into())
}

#[tauri::command]
async fn initial_intent<R: Runtime>(
    _app: AppHandle<R>,
    window: WebviewWindow<R>,
) -> Result<Option<String>, String> {
    require_window(&window)?;
    #[cfg(any(target_os = "android", target_os = "ios"))]
    return match mobile(&_app, "initialIntent", json!({}))?.get("url") {
        Some(Value::String(url)) => Ok(Some(url.clone())),
        Some(Value::Null) => Ok(None),
        _ => Err("Native link unavailable".into()),
    };
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    Ok(None)
}

#[tauri::command]
async fn pending_intents<R: Runtime>(
    _app: AppHandle<R>,
    window: WebviewWindow<R>,
) -> Result<Vec<String>, String> {
    require_window(&window)?;
    #[cfg(desktop)]
    return _app
        .state::<std::sync::Mutex<desktop_intents::DesktopIntents>>()
        .lock()
        .map(|mut mailbox| mailbox.take())
        .map_err(|_| "Native links unavailable".into());
    #[cfg(not(desktop))]
    Err("Pending native links unavailable on this platform".into())
}

#[tauri::command]
async fn set_back_handler<R: Runtime>(
    _app: AppHandle<R>,
    window: WebviewWindow<R>,
    enabled: bool,
) -> Result<(), String> {
    require_window(&window)?;
    #[cfg(target_os = "android")]
    mobile(&_app, "setBackHandler", json!({ "enabled": enabled }))?;
    #[cfg(not(target_os = "android"))]
    let _ = enabled;
    Ok(())
}

#[tauri::command]
async fn background_status<R: Runtime>(
    _app: AppHandle<R>,
    window: WebviewWindow<R>,
) -> Result<Value, String> {
    require_window(&window)?;
    #[cfg(target_os = "android")]
    return mobile(&_app, "backgroundStatus", json!({}));
    #[cfg(not(target_os = "android"))]
    Ok(json!({ "supported": false, "enabled": false }))
}

#[tauri::command]
async fn configure_background<R: Runtime>(
    _app: AppHandle<R>,
    window: WebviewWindow<R>,
    enabled: bool,
    next_expiry_ms: Option<i64>,
) -> Result<Value, String> {
    require_window(&window)?;
    if next_expiry_ms.is_some_and(|value| value < 0) {
        return Err("Invalid expiry timestamp".into());
    }
    #[cfg(not(target_os = "android"))]
    let _ = enabled;
    #[cfg(target_os = "android")]
    return mobile(
        &_app,
        "configureBackground",
        json!({ "enabled": enabled, "nextExpiryMs": next_expiry_ms }),
    );
    #[cfg(not(target_os = "android"))]
    Ok(json!({ "supported": false, "enabled": false }))
}

#[tauri::command]
async fn clear_background<R: Runtime>(
    _app: AppHandle<R>,
    window: WebviewWindow<R>,
) -> Result<(), String> {
    require_window(&window)?;
    #[cfg(target_os = "android")]
    mobile(&_app, "clearBackground", json!({}))?;
    Ok(())
}

#[tauri::command]
async fn export_backup<R: Runtime>(
    _app: AppHandle<R>,
    window: WebviewWindow<R>,
    contents: String,
    file_name: String,
) -> Result<(), String> {
    require_window(&window)?;
    backup::validate(&contents)?;
    backup::validate_name(&file_name)?;
    #[cfg(windows)]
    return tauri::async_runtime::spawn_blocking(move || {
        windows::export_backup(&window, &contents, &file_name)
    })
    .await
    .map_err(|_| "Backup export interrupted".to_owned())?;
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    return tauri::async_runtime::spawn_blocking(move || {
        desktop_services::export_backup(&window, &contents, &file_name)
    })
    .await
    .map_err(|_| "Backup export interrupted".to_owned())?;
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        mobile(
            &_app,
            "exportBackup",
            json!({ "contents": contents, "fileName": file_name }),
        )?;
        Ok(())
    }
    #[cfg(not(any(
        windows,
        target_os = "android",
        target_os = "ios",
        target_os = "macos",
        target_os = "linux"
    )))]
    Err("Native backup export is unavailable on this platform".into())
}

#[tauri::command]
async fn import_backup<R: Runtime>(
    _app: AppHandle<R>,
    window: WebviewWindow<R>,
) -> Result<String, String> {
    require_window(&window)?;
    #[cfg(windows)]
    let contents = tauri::async_runtime::spawn_blocking(move || windows::import_backup(&window))
        .await
        .map_err(|_| "Backup import interrupted".to_owned())??;
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    let contents =
        tauri::async_runtime::spawn_blocking(move || desktop_services::import_backup(&window))
            .await
            .map_err(|_| "Backup import interrupted".to_owned())??;
    #[cfg(any(target_os = "android", target_os = "ios"))]
    let contents = mobile(&_app, "importBackup", json!({}))?
        .get("contents")
        .and_then(Value::as_str)
        .ok_or("Backup import unavailable")?
        .to_owned();
    #[cfg(not(any(
        windows,
        target_os = "android",
        target_os = "ios",
        target_os = "macos",
        target_os = "linux"
    )))]
    return Err("Native backup import is unavailable on this platform".into());
    #[cfg(any(
        windows,
        target_os = "android",
        target_os = "ios",
        target_os = "macos",
        target_os = "linux"
    ))]
    {
        backup::validate(&contents)?;
        Ok(contents)
    }
}

#[cfg(target_os = "ios")]
pub fn receive_intent<R: Runtime>(app: &AppHandle<R>, url: String) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        let _: Result<Value, _> = app
            .state::<Mobile<R>>()
            .0
            .run_mobile_plugin_async("receiveIntent", json!({ "url": url }))
            .await;
    });
}

#[cfg(desktop)]
pub fn seed_initial_intents<R: Runtime>(app: &AppHandle<R>, urls: Vec<String>) {
    if let Ok(mut mailbox) = app
        .state::<std::sync::Mutex<desktop_intents::DesktopIntents>>()
        .lock()
    {
        mailbox.seed_initial(urls);
    }
}

#[cfg(desktop)]
pub fn receive_intent<R: Runtime>(app: &AppHandle<R>, url: String) {
    let accepted = app
        .state::<std::sync::Mutex<desktop_intents::DesktopIntents>>()
        .lock()
        .map(|mut mailbox| mailbox.push(url))
        .unwrap_or(false);
    if accepted {
        let _ = app.emit_to("main", "wallet:intent", ());
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    tauri::plugin::Builder::new("wallet")
        .invoke_handler(tauri::generate_handler![
            secret_get,
            secret_set,
            secret_remove,
            clipboard_read,
            clipboard_write,
            share_text,
            initial_intent,
            pending_intents,
            set_back_handler,
            background_status,
            configure_background,
            clear_background,
            export_backup,
            import_backup
        ])
        .setup(|_app, _api| {
            #[cfg(desktop)]
            _app.manage(std::sync::Mutex::new(desktop_intents::DesktopIntents::default()));
            #[cfg(target_os = "android")]
            _app.manage(Mobile::<R>(
                _api.register_android_plugin("io.arkade.wallet", "WalletPlugin")?,
            ));
            #[cfg(target_os = "ios")]
            _app.manage(Mobile::<R>(_api.register_ios_plugin(init_plugin_wallet)?));
            Ok(())
        })
        .build()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn native_access_rejects_untrusted_origins() {
        for raw in [
            "https://wallet.arkade.money",
            "https://tauri.localhost.evil.test",
            "http://tauri.localhost:8080",
            "http://user@tauri.localhost",
            "http://:password@tauri.localhost",
            "file:///tmp/index.html",
            "http://localhost:3003",
            "https://localhost:3002",
            "http://[::1]:3002",
        ] {
            assert!(!is_local_url(&tauri::Url::parse(raw).unwrap()), "{raw}");
        }
    }

    #[test]
    fn bundled_origins_are_allowed() {
        for raw in [
            "tauri://localhost/index.html",
            "http://tauri.localhost/index.html",
            "https://tauri.localhost/index.html",
        ] {
            assert!(is_local_url(&tauri::Url::parse(raw).unwrap()), "{raw}");
        }
    }

    #[test]
    fn debug_origin_is_narrow_and_build_scoped() {
        for raw in ["http://localhost:3002", "http://127.0.0.1:3002"] {
            assert_eq!(
                is_local_url(&tauri::Url::parse(raw).unwrap()),
                cfg!(debug_assertions),
                "{raw}"
            );
        }
    }

    #[test]
    fn secret_namespace_is_closed() {
        assert!(allowed_key("encrypted_mnemonic").is_ok());
        assert!(allowed_key("encrypted_private_key").is_ok());
        for key in [
            "",
            "wallet",
            "../encrypted_mnemonic",
            "encrypted_mnemonic\0",
        ] {
            assert!(allowed_key(key).is_err());
        }
    }
}
