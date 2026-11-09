fn main() {
    tauri_plugin::Builder::new(&["run", "all", "snapshot", "validate_snapshot", "restore"]).build();
}
