use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
#[cfg(desktop)]
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_opener::OpenerExt;

fn open_external<R: tauri::Runtime>(app: &tauri::AppHandle<R>, url: String) {
    let app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let _ = app.opener().open_url(url, None::<&str>);
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_deep_link::init());
    builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_wallet::init())
        .plugin(tauri_plugin_wallet_sql::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                let intent_app = app.handle().clone();
                app.deep_link().on_open_url(move |event| {
                    for url in event.urls() {
                        tauri_plugin_wallet::receive_intent(&intent_app, url.to_string());
                    }
                });
                if let Some(urls) = app.deep_link().get_current()? {
                    tauri_plugin_wallet::seed_initial_intents(
                        app.handle(),
                        urls.into_iter().map(|url| url.to_string()).collect(),
                    );
                }
            }
            #[cfg(any(target_os = "macos", target_os = "linux"))]
            app.handle().plugin(tauri_plugin_clipboard_manager::init())?;
            #[cfg(any(target_os = "android", target_os = "ios"))]
            {
                app.handle().plugin(tauri_plugin_barcode_scanner::init())?;
            }
            let platform = if cfg!(target_os = "android") { "android" } else if cfg!(target_os = "ios") { "ios" } else { "desktop" };
            let marker = format!(
                "(() => {{ const l = window.location; const local = !l.port && ((l.protocol === 'tauri:' && l.hostname === 'localhost') || (['http:', 'https:'].includes(l.protocol) && l.hostname === 'tauri.localhost')); if (window !== window.top || !local) return; Object.defineProperty(window, '__ARKADE_NATIVE__', {{value: Object.freeze({{version: 1, platform: '{platform}'}}), writable: false, configurable: false}}); }})();"
            );
            let navigation_app = app.handle().clone();
            let new_window_app = app.handle().clone();
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("Arkade")
                .inner_size(440.0, 850.0)
                .min_inner_size(360.0, 640.0)
                .initialization_script(&marker)
                .on_navigation(move |url| {
                    if tauri_plugin_wallet::is_local_url(url) { return true; }
                    if url.scheme() == "https" || (url.scheme() == "http" && matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "[::1]" | "::1"))) {
                        open_external(&navigation_app, url.as_str().to_owned());
                    }
                    false
                })
                .on_new_window(move |url, _| {
                    if url.scheme() == "https" || (url.scheme() == "http" && matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "[::1]" | "::1"))) {
                        open_external(&new_window_app, url.as_str().to_owned());
                    }
                    tauri::webview::NewWindowResponse::Deny
                })
                .build()?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("Unable to start Arkade native host")
        .run(|_app, _event| {
            #[cfg(target_os = "ios")]
            if let tauri::RunEvent::Opened { urls } = _event {
                for url in urls { tauri_plugin_wallet::receive_intent(_app, url.to_string()); }
            }
        });
}
