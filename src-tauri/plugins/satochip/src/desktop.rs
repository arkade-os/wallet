use super::SecretArguments;
use serde_json::{json, Value};
use std::{
    io::{BufRead, BufReader, Read, Write},
    path::{Path, PathBuf},
    process::{Child, ChildStdin, Command, Stdio},
    sync::mpsc::{self, Receiver},
    time::{Duration, Instant},
};
use zeroize::{Zeroize, Zeroizing};

const MAX_RESPONSE: usize = 16 * 1024;
const RESPONSE_TIMEOUT: Duration = Duration::from_secs(60);

struct Session {
    child: Child,
    input: Option<ChildStdin>,
    replies: Receiver<Result<Value, String>>,
    next_id: u64,
    #[cfg(windows)]
    _job: Option<WindowsJob>,
}

#[cfg(windows)]
struct WindowsJob(windows_sys::Win32::Foundation::HANDLE);

#[cfg(windows)]
// Job handles are process-wide; ownership moves with the serialized card session.
unsafe impl Send for WindowsJob {}

#[cfg(windows)]
impl Drop for WindowsJob {
    fn drop(&mut self) {
        unsafe {
            windows_sys::Win32::Foundation::CloseHandle(self.0);
        }
    }
}

#[cfg(windows)]
impl WindowsJob {
    fn attach(child: &mut Child) -> Result<Self, String> {
        use std::os::windows::io::AsRawHandle;
        use windows_sys::Win32::System::JobObjects::*;
        let handle = unsafe { CreateJobObjectW(std::ptr::null(), std::ptr::null()) };
        if handle.is_null() {
            let _ = child.kill();
            return Err("Unable to contain the card helper".into());
        }
        let job = Self(handle);
        let mut limits: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = unsafe { std::mem::zeroed() };
        limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        let configured = unsafe {
            SetInformationJobObject(
                handle,
                JobObjectExtendedLimitInformation,
                &limits as *const _ as *const _,
                std::mem::size_of_val(&limits) as u32,
            ) != 0
                && AssignProcessToJobObject(handle, child.as_raw_handle()) != 0
        };
        if !configured {
            let _ = child.kill();
            return Err("Unable to contain the card helper".into());
        }
        Ok(job)
    }
}

impl Drop for Session {
    fn drop(&mut self) {
        self.input.take();
        let deadline = Instant::now() + Duration::from_millis(750);
        while Instant::now() < deadline {
            match self.child.try_wait() {
                Ok(Some(_)) => return,
                Ok(None) => std::thread::sleep(Duration::from_millis(20)),
                Err(_) => break,
            }
        }
        #[cfg(windows)]
        self._job.take();
        #[cfg(unix)]
        if let Ok(pid) = i32::try_from(self.child.id()) {
            if pid > 0 {
                unsafe {
                    libc::kill(-pid, libc::SIGKILL);
                }
            }
        }
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

fn read_response(reader: &mut impl BufRead) -> Result<Option<Value>, String> {
    let mut line = String::new();
    let count = Read::take(reader, MAX_RESPONSE as u64 + 1)
        .read_line(&mut line)
        .map_err(|_| "Unable to read card response")?;
    if count == 0 {
        return Ok(None);
    }
    if count > MAX_RESPONSE || !line.ends_with('\n') {
        return Err("Card response exceeded the allowed size".into());
    }
    serde_json::from_str(&line)
        .map(Some)
        .map_err(|_| "Invalid card response".into())
}

impl Session {
    fn spawn(mut command: Command) -> Result<Self, String> {
        command
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null());
        command
            .env_remove("SATOCHIP_PIN")
            .env_remove("PYSATOCHIP_PIN");
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x08000000);
        }
        #[cfg(unix)]
        {
            use std::os::unix::process::CommandExt;
            command.process_group(0);
        }
        let mut child = command
            .spawn()
            .map_err(|_| "Unable to start the packaged Satochip bridge")?;
        #[cfg(windows)]
        let job = WindowsJob::attach(&mut child)?;
        let input = child.stdin.take().ok_or("Card bridge input unavailable")?;
        let output = child
            .stdout
            .take()
            .ok_or("Card bridge output unavailable")?;
        let (sender, replies) = mpsc::channel();
        std::thread::spawn(move || {
            let mut reader = BufReader::new(output);
            loop {
                let response = read_response(&mut reader);
                match response {
                    Ok(Some(value)) => {
                        if sender.send(Ok(value)).is_err() {
                            break;
                        }
                    }
                    Ok(None) => break,
                    Err(error) => {
                        let _ = sender.send(Err(error));
                        break;
                    }
                }
            }
        });
        Ok(Self {
            child,
            input: Some(input),
            replies,
            next_id: 1,
            #[cfg(windows)]
            _job: Some(job),
        })
    }

    fn rpc(&mut self, method: &str, arguments: Value) -> Result<Value, String> {
        let mut arguments = SecretArguments(arguments);
        let id = self.next_id;
        self.next_id = self
            .next_id
            .checked_add(1)
            .ok_or("Card request limit reached")?;
        arguments.0["id"] = json!(id);
        arguments.0["method"] = json!(method);
        let mut line = Zeroizing::new(
            serde_json::to_string(&arguments.0).map_err(|_| "Invalid card request")?,
        );
        arguments.clear();
        line.push('\n');
        let input = self.input.as_mut().ok_or("Card bridge disconnected")?;
        input
            .write_all(line.as_bytes())
            .map_err(|_| "Card bridge disconnected")?;
        input.flush().map_err(|_| "Card bridge disconnected")?;
        line.zeroize();
        let reply = self.replies.recv_timeout(RESPONSE_TIMEOUT).map_err(|_| {
            "Card response timed out or the card disconnected; reconnect explicitly"
        })??;
        response_result(reply, id)
    }
}

fn response_result(reply: Value, id: u64) -> Result<Value, String> {
    if reply.get("id").and_then(Value::as_u64) != Some(id) {
        return Err("Card response did not match the pending request".into());
    }
    if let Some(error) = reply.get("error") {
        let message = error
            .as_str()
            .filter(|value| value.len() <= 512)
            .unwrap_or("Card operation failed");
        return Err(message.to_owned());
    }
    reply
        .get("result")
        .filter(|value| value.is_object())
        .cloned()
        .ok_or_else(|| "Invalid card response payload".into())
}

pub struct Desktop {
    resources: PathBuf,
    session: Option<Session>,
}

fn helper_name(windows: bool) -> &'static str {
    if windows {
        "satochip-bridge.exe"
    } else {
        "satochip-bridge"
    }
}

fn bundled_helpers(
    executable: &Path,
    resources: &Path,
    windows: bool,
) -> Result<[PathBuf; 2], String> {
    let directory = executable
        .parent()
        .ok_or("Native executable directory unavailable")?;
    let file = helper_name(windows);
    Ok([directory.join(file), resources.join(file)])
}

fn virtualenv_python(source_root: &Path, windows: bool) -> PathBuf {
    source_root.join(if windows {
        ".sidecar-venv/Scripts/python.exe"
    } else {
        ".sidecar-venv/bin/python"
    })
}

impl Desktop {
    pub fn new(resources: PathBuf) -> Self {
        Self {
            resources,
            session: None,
        }
    }

    pub fn disconnect(&mut self) {
        self.session = None;
    }

    fn spawn(&self) -> Result<Session, String> {
        let executable = std::env::current_exe().map_err(|_| "Native executable unavailable")?;
        let packaged = bundled_helpers(&executable, &self.resources, cfg!(windows))?
            .into_iter()
            .find(|path| path.is_file());
        let mut command = if let Some(packaged) = packaged {
            Command::new(packaged)
        } else if cfg!(debug_assertions) {
            let source_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..");
            let binary = source_root.join("binaries").join(format!(
                "satochip-bridge-{}{}",
                env!("ARKADE_HOST_TRIPLE"),
                if cfg!(windows) { ".exe" } else { "" }
            ));
            if binary.is_file() {
                Command::new(binary)
            } else {
                let python = std::env::var_os("ARKADE_SATOCHIP_PYTHON")
                    .map(PathBuf::from)
                    .unwrap_or_else(|| virtualenv_python(&source_root, cfg!(windows)));
                if !python.is_file() {
                    return Err(
                        "Build the Satochip sidecar with node src-tauri/scripts/build-sidecar.mjs first"
                            .into(),
                    );
                }
                let mut command = Command::new(python);
                command
                    .arg("-u")
                    .arg(source_root.join("resources/bridge.py"));
                command
            }
        } else {
            return Err(
                "The packaged Satochip bridge is missing; reinstall the native host".into(),
            );
        };
        command.arg("--path").arg("m/86'/1'/0'/0/0");
        Session::spawn(command)
    }

    pub fn request(
        &mut self,
        method: &str,
        arguments: Value,
        valid: &dyn Fn() -> bool,
    ) -> Result<Value, String> {
        let mut arguments = SecretArguments(arguments);
        match method {
            "connect" => {
                let supplied_pin = supplied_pin(&mut arguments.0)?;
                self.disconnect();
                let mut session = self.spawn()?;
                let status = session.rpc("status", json!({}))?;
                if status.get("ready") != Some(&Value::Bool(true)) {
                    return Err("This Satochip is not ready. Initialize a fresh test wallet first, with Schnorr and Nostr signing enabled and 2FA disabled.".into());
                }
                let pin = match supplied_pin {
                    Some(pin) => pin,
                    None => prompt_pin(
                        arguments
                            .0
                            .get("parentWindow")
                            .and_then(Value::as_u64)
                            .unwrap_or(0) as usize,
                    )?,
                };
                if !valid() {
                    return Err("Card session changed; no PIN was sent".into());
                }
                let info = session.rpc("info", json!({ "pin": pin.as_str() }))?;
                let key = super::field_hex(&info, "publicKey", &[33])?;
                self.session = Some(session);
                Ok(json!({ "publicKey": key, "name": "Satochip" }))
            }
            "disconnect" => {
                self.disconnect();
                Ok(json!({}))
            }
            "inspect" => {
                self.disconnect();
                let mut session = self.spawn()?;
                session.rpc("status", json!({}))
            }
            "setup" => {
                validate_setup_arguments(&arguments.0)?;
                self.disconnect();
                let mut session = self.spawn()?;
                let status = session.rpc("status", json!({}))?;
                if status.get("seeded") != Some(&Value::Bool(false)) {
                    return Err("Satochip is already seeded or its seed state is unknown; refusing to replace its wallet".into());
                }
                if !valid() {
                    return Err("Card setup cancelled; no setup secrets were sent".into());
                }
                let result = session.rpc("setup", arguments.take())?;
                super::field_hex(&result, "publicKey", &[33])?;
                Ok(result)
            }
            "presence" => {
                let Some(mut session) = self.session.take() else {
                    return Ok(json!({ "connected": false }));
                };
                let result = session.rpc("presence", json!({}))?;
                let connected = result
                    .get("connected")
                    .and_then(Value::as_bool)
                    .ok_or("Invalid native presence response")?;
                if connected {
                    self.session = Some(session);
                }
                Ok(json!({ "connected": connected }))
            }
            "status" if self.session.is_none() => {
                let mut session = self.spawn()?;
                session.rpc("status", json!({}))
            }
            "status" | "getPublicKey" | "signSchnorr" | "signEcdsa" => {
                let mut session = self
                    .session
                    .take()
                    .ok_or("Card is locked; connect Satochip first")?;
                let bridge_method = match method {
                    "getPublicKey" => "info",
                    "signSchnorr" => "schnorr",
                    "signEcdsa" => "ecdsa",
                    _ => "status",
                };
                let result = session.rpc(bridge_method, arguments.take());
                if result.is_ok() {
                    self.session = Some(session);
                }
                result
            }
            _ => Err("Unknown native card operation".into()),
        }
    }
}

fn supplied_pin(arguments: &mut Value) -> Result<Option<Zeroizing<String>>, String> {
    match arguments.get_mut("pin") {
        None | Some(Value::Null) => Ok(None),
        Some(Value::String(pin)) => {
            super::validate_pin(pin)?;
            Ok(Some(Zeroizing::new(std::mem::take(pin))))
        }
        _ => Err("PIN must be a string; no PIN was sent to the card".into()),
    }
}

fn validate_setup_arguments(arguments: &Value) -> Result<(), String> {
    let pin = arguments
        .get("pin")
        .and_then(Value::as_str)
        .ok_or("Provide a card PIN")?;
    let puk = match arguments.get("puk") {
        None | Some(Value::Null) => None,
        Some(Value::String(value)) => Some(value.as_str()),
        _ => return Err("Invalid PIN recovery code".into()),
    };
    let seed = arguments
        .get("seed")
        .and_then(Value::as_str)
        .ok_or("Provide a BIP39 seed")?;
    super::validate_setup(pin, puk, seed)
}

#[cfg(windows)]
fn prompt_pin(parent: usize) -> Result<Zeroizing<String>, String> {
    use windows_sys::Win32::{Foundation::ERROR_CANCELLED, Security::Credentials::*};
    let wide = |text: &str| text.encode_utf16().chain(Some(0)).collect::<Vec<_>>();
    let title = wide("Unlock Satochip");
    let message = wide("Enter your Satochip PIN in the password field. One attempt only; it is never sent to the wallet page.");
    let target = wide("Arkade Satochip test wallet");
    let mut username = wide("Satochip");
    username.resize(128, 0);
    let mut password = Zeroizing::new(vec![0u16; 128]);
    let info = CREDUI_INFOW {
        cbSize: std::mem::size_of::<CREDUI_INFOW>() as u32,
        hwndParent: parent as *mut _,
        pszMessageText: message.as_ptr(),
        pszCaptionText: title.as_ptr(),
        hbmBanner: std::ptr::null_mut(),
    };
    let mut save = 0;
    let status = unsafe {
        CredUIPromptForCredentialsW(
            &info,
            target.as_ptr(),
            std::ptr::null(),
            0,
            username.as_mut_ptr(),
            username.len() as u32,
            password.as_mut_ptr(),
            password.len() as u32,
            &mut save,
            CREDUI_FLAGS_GENERIC_CREDENTIALS
                | CREDUI_FLAGS_DO_NOT_PERSIST
                | CREDUI_FLAGS_ALWAYS_SHOW_UI,
        )
    };
    if status == ERROR_CANCELLED {
        return Err("Satochip unlock cancelled".into());
    }
    if status != 0 {
        return Err("Unable to display the native Satochip PIN prompt".into());
    }
    let length = password
        .iter()
        .position(|character| *character == 0)
        .unwrap_or(password.len());
    let pin = Zeroizing::new(String::from_utf16(&password[..length]).map_err(|_| "Invalid PIN")?);
    super::validate_pin(&pin)?;
    Ok(pin)
}

#[cfg(not(windows))]
fn prompt_pin(_parent: usize) -> Result<Zeroizing<String>, String> {
    Err("Enter the card PIN in the app connection sheet".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    #[test]
    fn bundled_helpers_follow_native_application_layouts() {
        assert_eq!(
            bundled_helpers(
                Path::new("/Applications/Arkade.app/Contents/MacOS/arkade"),
                Path::new("/Applications/Arkade.app/Contents/Resources"),
                false,
            )
            .unwrap(),
            [
                PathBuf::from("/Applications/Arkade.app/Contents/MacOS/satochip-bridge"),
                PathBuf::from("/Applications/Arkade.app/Contents/Resources/satochip-bridge"),
            ]
        );
        assert_eq!(
            bundled_helpers(
                Path::new("/usr/bin/arkade"),
                Path::new("/usr/lib/arkade"),
                false,
            )
            .unwrap(),
            [
                PathBuf::from("/usr/bin/satochip-bridge"),
                PathBuf::from("/usr/lib/arkade/satochip-bridge"),
            ]
        );
        assert_eq!(
            bundled_helpers(Path::new("app/arkade.exe"), Path::new("resources"), true).unwrap()[0],
            PathBuf::from("app/satochip-bridge.exe")
        );
    }

    #[test]
    fn development_python_uses_the_host_virtualenv_layout() {
        assert_eq!(
            virtualenv_python(Path::new("native"), true),
            PathBuf::from("native/.sidecar-venv/Scripts/python.exe")
        );
        assert_eq!(
            virtualenv_python(Path::new("native"), false),
            PathBuf::from("native/.sidecar-venv/bin/python")
        );
    }

    #[test]
    fn reads_one_bounded_json_line_at_a_time() {
        let mut reader = Cursor::new(b"{\"id\":1}\n{\"id\":2}\n");
        assert_eq!(read_response(&mut reader).unwrap().unwrap()["id"], 1);
        assert_eq!(read_response(&mut reader).unwrap().unwrap()["id"], 2);
        assert!(read_response(&mut reader).unwrap().is_none());
    }

    #[test]
    fn rejects_unbounded_and_incomplete_protocol_lines() {
        assert!(read_response(&mut Cursor::new(vec![b'x'; MAX_RESPONSE + 1])).is_err());
        assert!(read_response(&mut Cursor::new(b"{}".to_vec())).is_err());
        assert!(read_response(&mut Cursor::new(b"oops\n".to_vec())).is_err());
    }

    #[test]
    fn rejects_wrong_ids_and_invalid_response_shapes() {
        assert!(response_result(json!({"id": 2, "result": {}}), 1).is_err());
        assert!(response_result(json!({"id": 1, "result": "not an object"}), 1).is_err());
        assert!(response_result(json!({"id": 1, "error": "Card removed"}), 1).is_err());
        assert_eq!(
            response_result(json!({"id": 1, "error": "x".repeat(513)}), 1).unwrap_err(),
            "Card operation failed"
        );
        assert_eq!(
            response_result(json!({"id": 1, "result": {"ready": true}}), 1).unwrap()["ready"],
            true
        );
    }

    #[test]
    fn locked_presence_does_not_start_a_helper() {
        let mut desktop = Desktop::new(PathBuf::from("missing-resources"));
        assert_eq!(
            desktop.request("presence", json!({}), &|| true).unwrap(),
            json!({ "connected": false })
        );
        assert!(desktop.session.is_none());
    }

    #[test]
    fn provided_pin_preserves_leading_zeroes_and_skips_the_native_prompt() {
        let mut arguments = json!({ "pin": "001234" });
        assert_eq!(
            supplied_pin(&mut arguments).unwrap().unwrap().as_str(),
            "001234"
        );
        assert_eq!(arguments["pin"], "");
        assert!(supplied_pin(&mut json!({})).unwrap().is_none());
        assert!(supplied_pin(&mut json!({ "pin": null })).unwrap().is_none());
    }

    #[test]
    fn invalid_supplied_secrets_do_not_start_a_helper_or_show_a_prompt() {
        let mut desktop = Desktop::new(PathBuf::from("missing-resources"));
        for pin in [json!(123456), json!("12345"), json!("１２３４５６")] {
            assert!(desktop
                .request("connect", json!({ "pin": pin }), &|| true)
                .unwrap_err()
                .contains("PIN"));
        }
        for arguments in [
            json!({}),
            json!({"pin":"123456", "seed":"bad"}),
            json!({"pin":"123456", "puk": 123, "seed":"42".repeat(64)}),
        ] {
            assert!(desktop.request("setup", arguments, &|| true).is_err());
        }
        assert!(desktop.session.is_none());
    }

    #[cfg(windows)]
    #[test]
    fn presence_retains_only_the_same_live_helper() {
        for connected in [true, false] {
            let mut command = Command::new("powershell.exe");
            command.args(["-NoProfile", "-Command", &format!(
                "$request = [Console]::In.ReadLine() | ConvertFrom-Json; if ($request.method -ne 'presence') {{ exit 1 }}; [Console]::Out.WriteLine((@{{id=$request.id;result=@{{connected=${connected}}}}} | ConvertTo-Json -Compress)); $null = [Console]::In.ReadToEnd()"
            )]);
            let mut desktop = Desktop::new(PathBuf::new());
            desktop.session = Some(Session::spawn(command).unwrap());
            assert_eq!(
                desktop.request("presence", json!({}), &|| true).unwrap(),
                json!({ "connected": connected })
            );
            assert_eq!(desktop.session.is_some(), connected);
        }
    }

    #[cfg(any(windows, unix))]
    #[test]
    fn normal_close_allows_the_helper_to_release_its_card() {
        let marker = std::env::temp_dir().join(format!(
            "arkade-helper-exit-{}-{}.txt",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        #[cfg(windows)]
        let mut command = {
            let mut command = Command::new("powershell.exe");
            command.args(["-NoProfile", "-Command", "[Console]::Out.WriteLine('{\"id\":0,\"result\":{}}'); $null = [Console]::In.ReadToEnd(); [IO.File]::WriteAllText($env:ARKADE_TEST_EXIT_MARKER, 'graceful')"]);
            command
        };
        #[cfg(unix)]
        let mut command = {
            let mut command = Command::new("sh");
            command.args(["-c", "printf '%s\\n' '{\"id\":0,\"result\":{}}'; cat >/dev/null; printf graceful > \"$ARKADE_TEST_EXIT_MARKER\""]);
            command
        };
        command.env("ARKADE_TEST_EXIT_MARKER", &marker);
        let session = Session::spawn(command).unwrap();
        session
            .replies
            .recv_timeout(Duration::from_secs(10))
            .unwrap()
            .unwrap();
        drop(session);
        let result = std::fs::read_to_string(&marker);
        if marker.is_file() {
            std::fs::remove_file(&marker).unwrap();
        }
        assert_eq!(result.unwrap(), "graceful");
    }

    #[cfg(unix)]
    #[test]
    fn forced_close_terminates_the_owned_helper_process_group() {
        let mut command = Command::new("sh");
        command.args([
            "-c",
            "sleep 60 & printf '%s\\n' '{\"id\":0,\"result\":{}}'; wait",
        ]);
        let mut session = Session::spawn(command).unwrap();
        session
            .replies
            .recv_timeout(Duration::from_secs(10))
            .unwrap()
            .unwrap();
        let process_group = i32::try_from(session.child.id()).unwrap();
        assert!(process_group > 0);
        let (_sender, empty) = mpsc::channel();
        let replies = std::mem::replace(&mut session.replies, empty);
        drop(session);
        let result = replies.recv_timeout(Duration::from_secs(5));
        if !matches!(result, Err(mpsc::RecvTimeoutError::Disconnected)) {
            unsafe {
                libc::kill(-process_group, libc::SIGKILL);
            }
        }
        assert!(matches!(result, Err(mpsc::RecvTimeoutError::Disconnected)));
    }
}
