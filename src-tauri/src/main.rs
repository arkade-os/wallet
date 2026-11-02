#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(desktop)]
    if std::env::args().nth(1).as_deref() == Some("--card-status") {
        match tauri_plugin_satochip::diagnostic_status() {
            Ok(status) => println!("{status}"),
            Err(error) => {
                eprintln!("{error}");
                std::process::exit(1);
            }
        }
        return;
    }
    arkade_native_lib::run();
}
