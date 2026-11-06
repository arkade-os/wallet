fn main() {
    println!("cargo:rerun-if-env-changed=TAURI_IOS_PROJECT_PATH");
    println!("cargo:rerun-if-env-changed=TAURI_IOS_APP_NAME");
    #[cfg(target_os = "macos")]
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("ios") {
        tauri_plugin::mobile::update_entitlements(|plist| {
            let key = "com.apple.developer.nfc.readersession.formats";
            if !plist.contains_key(key) {
                plist.insert(key.to_owned(), vec!["TAG".into()].into());
            }
            let formats = plist.get_mut(key).expect("NFC entitlement is missing");
            let values = formats
                .as_array_mut()
                .expect("NFC entitlement must be an array");
            if !values.iter().any(|value| value.as_string() == Some("TAG")) {
                values.push("TAG".into());
            }
        })
        .expect("Unable to configure NFC entitlement");
    }
    println!(
        "cargo:rustc-env=ARKADE_HOST_TRIPLE={}",
        std::env::var("TARGET").unwrap()
    );
    tauri_plugin::Builder::new(&[
        "connect",
        "inspect",
        "setup_card",
        "get_public_key",
        "sign_schnorr",
        "sign_ecdsa",
        "disconnect",
        "status",
        "presence",
        "open",
        "begin_operation",
        "transmit",
        "end_operation",
        "cancel",
        "register_listener",
        "remove_listener",
    ])
    .android_path("android")
    .ios_path("ios")
    .build();
}
