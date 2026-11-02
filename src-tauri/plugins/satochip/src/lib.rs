use serde_json::{json, Value};
use std::sync::{
    atomic::{AtomicU64, Ordering},
    Arc,
};
use tauri::{plugin::TauriPlugin, AppHandle, Manager, Runtime, WebviewWindow};
use zeroize::{Zeroize, Zeroizing};

#[cfg(desktop)]
mod desktop;
#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_satochip);

struct SecretArguments(Value);

impl SecretArguments {
    fn take(mut self) -> Value {
        self.0.take()
    }

    fn clear(&mut self) {
        for key in ["pin", "puk", "seed"] {
            if let Some(Value::String(value)) = self.0.get_mut(key) {
                value.zeroize();
            }
        }
    }
}

impl Drop for SecretArguments {
    fn drop(&mut self) {
        self.clear();
    }
}

struct Satochip<R: Runtime> {
    epoch: Arc<AtomicU64>,
    #[cfg(desktop)]
    desktop: Arc<std::sync::Mutex<desktop::Desktop>>,
    #[cfg(any(target_os = "android", target_os = "ios"))]
    mobile: tauri::plugin::PluginHandle<R>,
    _runtime: std::marker::PhantomData<fn() -> R>,
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
    if window.label() != "main" || !is_local_url(&window.url().map_err(|_| "Invalid host window")?)
    {
        return Err("Card access is restricted to the bundled wallet".into());
    }
    Ok(())
}

async fn request<R: Runtime>(
    app: AppHandle<R>,
    method: &'static str,
    args: Value,
) -> Result<Value, String> {
    let args = SecretArguments(args);
    let epoch = Arc::clone(&app.state::<Satochip<R>>().epoch);
    let generation = if matches!(
        method,
        "connect" | "disconnect" | "inspect" | "setup" | "open" | "cancel"
    ) {
        epoch.fetch_add(1, Ordering::SeqCst) + 1
    } else {
        epoch.load(Ordering::SeqCst)
    };
    #[cfg(desktop)]
    {
        let desktop = Arc::clone(&app.state::<Satochip<R>>().desktop);
        tauri::async_runtime::spawn_blocking(move || {
            let mut desktop = desktop
                .lock()
                .map_err(|_| "Card session unavailable".to_string())?;
            let valid = || epoch.load(Ordering::SeqCst) == generation;
            if !valid() {
                return Err("Card session changed; reconnect explicitly".into());
            }
            let result = desktop.request(method, args.take(), &valid);
            if !valid() {
                desktop.disconnect();
                return Err("Card session changed; reconnect explicitly".into());
            }
            result
        })
        .await
        .map_err(|_| "Card operation interrupted".to_string())?
    }
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        #[cfg(target_os = "ios")]
        let method = match method {
            "presence" => "status",
            "open" | "begin_operation" | "transmit" | "end_operation" | "disconnect" | "status"
            | "cancel" => method,
            _ => return Err("Use the bundled card protocol for iOS NFC".into()),
        };
        let result = app
            .state::<Satochip<R>>()
            .mobile
            .run_mobile_plugin(method, &args.0)
            .map_err(|error| error.to_string());
        if epoch.load(Ordering::SeqCst) != generation {
            return Err("Card session changed; reconnect explicitly".into());
        }
        result
    }
}

async fn raw_request<R: Runtime>(
    app: AppHandle<R>,
    window: WebviewWindow<R>,
    method: &'static str,
    args: Value,
) -> Result<Value, String> {
    require_window(&window)?;
    #[cfg(target_os = "ios")]
    return request(app, method, args).await;
    #[cfg(not(target_os = "ios"))]
    {
        let _ = (app, method, args);
        Err("Raw NFC is unavailable on this platform".into())
    }
}

#[tauri::command]
async fn open<R: Runtime>(app: AppHandle<R>, window: WebviewWindow<R>) -> Result<Value, String> {
    raw_request(app, window, "open", json!({})).await
}

#[tauri::command]
async fn begin_operation<R: Runtime>(
    app: AppHandle<R>,
    window: WebviewWindow<R>,
) -> Result<Value, String> {
    raw_request(app, window, "begin_operation", json!({})).await
}

#[tauri::command]
async fn transmit<R: Runtime>(
    app: AppHandle<R>,
    window: WebviewWindow<R>,
    command_hex: String,
) -> Result<Value, String> {
    validate_hex(&command_hex, &(4..=261).collect::<Vec<_>>())?;
    raw_request(
        app,
        window,
        "transmit",
        json!({ "commandHex": command_hex }),
    )
    .await
}

#[tauri::command]
async fn end_operation<R: Runtime>(
    app: AppHandle<R>,
    window: WebviewWindow<R>,
) -> Result<Value, String> {
    raw_request(app, window, "end_operation", json!({})).await
}

#[tauri::command]
async fn cancel<R: Runtime>(app: AppHandle<R>, window: WebviewWindow<R>) -> Result<Value, String> {
    raw_request(app, window, "cancel", json!({})).await
}

#[tauri::command]
async fn connect<R: Runtime>(
    app: AppHandle<R>,
    window: WebviewWindow<R>,
    pin: Option<String>,
) -> Result<Value, String> {
    let pin = pin.map(Zeroizing::new);
    require_window(&window)?;
    if let Some(pin) = pin.as_ref() {
        validate_pin(pin)?;
    }
    #[cfg(windows)]
    let mut arguments =
        json!({"parentWindow": window.hwnd().map_err(|_| "Wallet window unavailable")?.0 as usize});
    #[cfg(not(windows))]
    let mut arguments = json!({});
    if let Some(pin) = pin.as_ref() {
        arguments["pin"] = json!(pin.as_str());
    }
    request(app, "connect", arguments).await
}

#[tauri::command]
async fn inspect<R: Runtime>(app: AppHandle<R>, window: WebviewWindow<R>) -> Result<Value, String> {
    require_window(&window)?;
    request(app, "inspect", json!({})).await
}

#[tauri::command]
async fn setup_card<R: Runtime>(
    app: AppHandle<R>,
    window: WebviewWindow<R>,
    pin: String,
    puk: Option<String>,
    seed: String,
) -> Result<Value, String> {
    let pin = Zeroizing::new(pin);
    let puk = puk.map(Zeroizing::new);
    let seed = Zeroizing::new(seed);
    require_window(&window)?;
    validate_setup(&pin, puk.as_ref().map(|value| value.as_str()), &seed)?;
    request(
        app,
        "setup",
        json!({"pin": pin.as_str(), "puk": puk.as_ref().map(|value| value.as_str()), "seed": seed.as_str()}),
    )
    .await
}

#[tauri::command]
async fn get_public_key<R: Runtime>(
    app: AppHandle<R>,
    window: WebviewWindow<R>,
) -> Result<String, String> {
    require_window(&window)?;
    let value = request(app, "getPublicKey", json!({})).await?;
    field_hex(&value, "publicKey", &[33])
}

#[tauri::command]
async fn sign_schnorr<R: Runtime>(
    app: AppHandle<R>,
    window: WebviewWindow<R>,
    hash: String,
    tweak: Option<String>,
) -> Result<String, String> {
    require_window(&window)?;
    validate_hex(&hash, &[32])?;
    if let Some(ref root) = tweak {
        validate_hex(root, &[0, 32])?;
    }
    let value = request(app, "signSchnorr", json!({ "hash": hash, "tweak": tweak })).await?;
    field_hex(&value, "signature", &[64])
}

#[tauri::command]
async fn sign_ecdsa<R: Runtime>(
    app: AppHandle<R>,
    window: WebviewWindow<R>,
    hash: String,
) -> Result<String, String> {
    require_window(&window)?;
    validate_hex(&hash, &[32])?;
    let value = request(app, "signEcdsa", json!({ "hash": hash })).await?;
    field_hex(&value, "signature", &(8..=72).collect::<Vec<_>>())
}

#[tauri::command]
async fn disconnect<R: Runtime>(app: AppHandle<R>, window: WebviewWindow<R>) -> Result<(), String> {
    require_window(&window)?;
    request(app, "disconnect", json!({})).await?;
    Ok(())
}

#[tauri::command]
async fn status<R: Runtime>(app: AppHandle<R>, window: WebviewWindow<R>) -> Result<Value, String> {
    require_window(&window)?;
    request(app, "status", json!({})).await
}

#[tauri::command]
async fn presence<R: Runtime>(
    app: AppHandle<R>,
    window: WebviewWindow<R>,
) -> Result<Value, String> {
    require_window(&window)?;
    request(app, "presence", json!({})).await
}

fn validate_hex(value: &str, lengths: &[usize]) -> Result<(), String> {
    if value.len() % 2 != 0
        || !lengths.contains(&(value.len() / 2))
        || !value.bytes().all(|byte| byte.is_ascii_hexdigit())
    {
        return Err("Invalid card request bytes".into());
    }
    Ok(())
}

fn validate_pin(pin: &str) -> Result<(), String> {
    if !(6..=16).contains(&pin.len()) || !pin.bytes().all(|value| value.is_ascii_digit()) {
        return Err("PIN must contain 6 to 16 ASCII digits; no PIN was sent to the card".into());
    }
    Ok(())
}

fn validate_setup(pin: &str, puk: Option<&str>, seed: &str) -> Result<(), String> {
    validate_pin(pin)?;
    if let Some(puk) = puk {
        validate_hex(puk, &[8])
            .map_err(|_| "PIN recovery code must contain 16 hexadecimal characters")?;
    }
    validate_hex(seed, &[64]).map_err(|_| "Provide a 64-byte BIP39 seed".into())
}

fn field_hex(value: &Value, field: &str, lengths: &[usize]) -> Result<String, String> {
    let result = value
        .get(field)
        .and_then(Value::as_str)
        .ok_or("Invalid native response")?;
    validate_hex(result, lengths)?;
    Ok(result.to_owned())
}

pub fn disconnect_on_close<R: Runtime>(_app: &AppHandle<R>) {
    #[cfg(any(target_os = "android", target_os = "ios"))]
    if let Some(state) = _app.try_state::<Satochip<R>>() {
        state.epoch.fetch_add(1, Ordering::SeqCst);
        let app = _app.clone();
        tauri::async_runtime::spawn(async move {
            let _: Result<Value, _> = app
                .state::<Satochip<R>>()
                .mobile
                .run_mobile_plugin_async("disconnect", json!({}))
                .await;
        });
    }
    #[cfg(desktop)]
    if let Some(state) = _app.try_state::<Satochip<R>>() {
        state.epoch.fetch_add(1, Ordering::SeqCst);
        if let Ok(mut desktop) = state.desktop.try_lock() {
            desktop.disconnect();
        }
    }
}

#[cfg(desktop)]
pub fn diagnostic_status() -> Result<Value, String> {
    let directory = std::env::current_exe()
        .map_err(|_| "Native executable unavailable")?
        .parent()
        .ok_or("Native executable directory unavailable")?
        .to_path_buf();
    desktop::Desktop::new(directory).request("status", json!({}), &|| true)
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    tauri::plugin::Builder::new("satochip")
        .invoke_handler(tauri::generate_handler![
            connect,
            inspect,
            setup_card,
            get_public_key,
            sign_schnorr,
            sign_ecdsa,
            disconnect,
            status,
            presence,
            open,
            begin_operation,
            transmit,
            end_operation,
            cancel
        ])
        .setup(|app, _api| {
            #[cfg(desktop)]
            let desktop = Arc::new(std::sync::Mutex::new(desktop::Desktop::new(
                app.path().resource_dir()?,
            )));
            #[cfg(target_os = "android")]
            let mobile = _api.register_android_plugin("io.arkade.satochip", "SatochipPlugin")?;
            #[cfg(target_os = "ios")]
            let mobile = _api.register_ios_plugin(init_plugin_satochip)?;
            app.manage(Satochip::<R> {
                epoch: Arc::new(AtomicU64::new(0)),
                #[cfg(desktop)]
                desktop,
                #[cfg(any(target_os = "android", target_os = "ios"))]
                mobile,
                _runtime: std::marker::PhantomData,
            });
            Ok(())
        })
        .build()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bridge_bytes_are_bounded_and_hexadecimal() {
        assert!(validate_hex(&"ab".repeat(32), &[32]).is_ok());
        assert!(validate_hex("", &[0, 32]).is_ok());
        assert!(validate_hex("0", &[32]).is_err());
        assert!(validate_hex(&"gg".repeat(32), &[32]).is_err());
        assert!(validate_hex(&"ab".repeat(33), &[32]).is_err());
    }

    #[test]
    fn setup_secrets_are_validated_without_echoing_their_values() {
        assert!(validate_setup("012345", Some("abcdef0123456789"), &"42".repeat(64)).is_ok());
        assert!(validate_setup("012345", None, &"42".repeat(64)).is_ok());
        for pin in ["12345", "12345678901234567", "１２３４５６", "12345a"] {
            assert!(validate_pin(pin).is_err());
        }
        assert!(validate_setup("012345", Some("xyz"), &"42".repeat(64)).is_err());
        assert!(validate_setup("012345", None, &"42".repeat(63)).is_err());
    }

    #[test]
    fn native_secret_arguments_are_erased_without_changing_public_fields() {
        let mut arguments = SecretArguments(json!({
            "pin": "012345", "puk": "abcdef0123456789", "seed": "42".repeat(64), "method": "setup"
        }));
        arguments.clear();
        for key in ["pin", "puk", "seed"] {
            assert_eq!(arguments.0[key], "");
        }
        assert_eq!(arguments.0["method"], "setup");
    }

    #[test]
    fn remote_windows_never_receive_the_bridge() {
        for raw in [
            "https://wallet.arkade.money",
            "https://tauri.localhost.evil.test",
            "http://tauri.localhost:8080",
            "http://user@tauri.localhost",
            "file:///tmp/index.html",
        ] {
            assert!(!is_local_url(&tauri::Url::parse(raw).unwrap()));
        }
        assert!(is_local_url(
            &tauri::Url::parse("http://tauri.localhost/index.html").unwrap()
        ));
        assert!(is_local_url(
            &tauri::Url::parse("tauri://localhost/index.html").unwrap()
        ));
    }
}
