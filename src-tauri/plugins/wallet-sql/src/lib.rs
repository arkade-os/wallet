use rusqlite::{
    hooks::{AuthAction, AuthContext, Authorization},
    params_from_iter,
    types::{Value as SqlValue, ValueRef},
    Connection, OpenFlags,
};
use serde_json::{Map, Value};
use parking_lot::ReentrantMutex;
use std::{
    collections::HashMap,
    path::PathBuf,
    sync::Arc,
    time::Duration,
};
use tauri::{plugin::TauriPlugin, AppHandle, Manager, Runtime, WebviewWindow};

struct Databases {
    directory: PathBuf,
    connections: std::sync::Mutex<HashMap<String, Arc<ReentrantMutex<Connection>>>>,
}

const TABLES: &[&str] = &[
    "ark_vtxos",
    "ark_utxos",
    "ark_transactions",
    "ark_wallet_state",
    "ark_contracts",
    "ark_intents",
    "ark_virtual_txs",
    "ark_vtxo_branches",
    "native_storage_migrations",
];

fn table_columns(connection: &Connection, table: &str) -> Result<Vec<String>, String> {
    let rows = execute(
        connection,
        &format!("PRAGMA table_info({table})"),
        vec![],
        true,
    )?;
    if rows.is_empty() {
        return Err("Wallet storage schema is not initialized".into());
    }
    rows.into_iter()
        .map(|row| {
            row.get("name")
                .and_then(Value::as_str)
                .map(str::to_owned)
                .ok_or_else(|| "Invalid wallet storage schema".into())
        })
        .collect()
}

fn capture(connection: &Connection, namespace: &str) -> Result<Value, String> {
    let mut tables = Map::new();
    for table in TABLES {
        let columns = table_columns(connection, table)?;
        let records = execute(connection, &format!("SELECT * FROM {table}"), vec![], true)?;
        let mut rows = records
            .into_iter()
            .map(|record| {
                Value::Array(
                    columns
                        .iter()
                        .map(|column| record[column].clone())
                        .collect(),
                )
            })
            .collect::<Vec<_>>();
        rows.sort_by_key(Value::to_string);
        tables.insert(
            (*table).into(),
            serde_json::json!({"columns": columns, "rows": rows}),
        );
    }
    let snapshot = serde_json::json!({"version": 1, "namespace": namespace, "tables": tables});
    validate_capture(connection, namespace, &snapshot)?;
    Ok(snapshot)
}

fn validate_capture(
    connection: &Connection,
    namespace: &str,
    snapshot: &Value,
) -> Result<(), String> {
    if snapshot.get("version").and_then(Value::as_u64) != Some(1)
        || snapshot.get("namespace").and_then(Value::as_str) != Some(namespace)
        || snapshot.as_object().map_or(true, |root| root.len() != 3)
        || serde_json::to_vec(snapshot)
            .map_err(|_| "Invalid wallet state backup")?
            .len()
            > 64 * 1024 * 1024
    {
        return Err("Invalid or incompatible wallet state backup".into());
    }
    let tables = snapshot
        .get("tables")
        .and_then(Value::as_object)
        .ok_or("Invalid wallet state tables")?;
    if tables.len() != TABLES.len() || tables.keys().any(|name| !TABLES.contains(&name.as_str())) {
        return Err("Unsupported wallet state tables".into());
    }
    for name in TABLES {
        let table = tables
            .get(*name)
            .and_then(Value::as_object)
            .ok_or("Missing wallet state table")?;
        let columns = table_columns(connection, name)?;
        if table.len() != 2 || table.get("columns") != Some(&serde_json::json!(columns)) {
            return Err("Wallet state columns do not match this app version".into());
        }
        let rows = table
            .get("rows")
            .and_then(Value::as_array)
            .ok_or("Invalid wallet state rows")?;
        if rows.len() > 100_000 {
            return Err("Wallet state table exceeded its row limit".into());
        }
        for row in rows {
            let values = row.as_array().ok_or("Invalid wallet state row")?;
            if values.len() != columns.len() {
                return Err("Wallet state row does not match its schema".into());
            }
            if values.iter().any(Value::is_boolean) {
                return Err("SQLite backup booleans must use their numeric encoding".into());
            }
            parameters(values.clone())?;
            for (column, value) in columns.iter().zip(values) {
                if column.ends_with("_json") && !value.is_null() {
                    serde_json::from_str::<Value>(
                        value.as_str().ok_or("Invalid wallet state JSON field")?,
                    )
                    .map_err(|_| "Invalid wallet state JSON field")?;
                }
            }
        }
    }
    let receipts = tables["native_storage_migrations"]["rows"]
        .as_array()
        .unwrap();
    if receipts.is_empty() {
        return Err("Wallet state is missing its storage migration receipt".into());
    }
    for row in receipts {
        let source = row[0].as_str().ok_or("Invalid wallet state receipt")?;
        if source != namespace && source != "arkade-service-worker" {
            return Err("Invalid wallet state receipt source".into());
        }
        let receipt: Value =
            serde_json::from_str(row[1].as_str().ok_or("Invalid wallet state receipt")?)
                .map_err(|_| "Invalid wallet state receipt")?;
        if receipt["version"] != 1
            || receipt["addresses"].as_u64().is_none()
            || receipt["digest"].as_str().map_or(true, |digest| {
                digest.len() != 64 || !digest.bytes().all(|byte| byte.is_ascii_hexdigit())
            })
        {
            return Err("Invalid wallet state receipt".into());
        }
    }
    Ok(())
}

fn snapshot_connection(connection: &Connection, namespace: &str) -> Result<Value, String> {
    if !connection.is_autocommit() {
        return Err("Wait for the active wallet operation before backing up".into());
    }
    connection
        .execute_batch("BEGIN DEFERRED")
        .map_err(|_| "Unable to start wallet state snapshot")?;
    let result = capture(connection, namespace);
    let finish = connection.execute_batch(if result.is_ok() { "COMMIT" } else { "ROLLBACK" });
    finish.map_err(|_| "Unable to finish wallet state snapshot")?;
    result
}

fn insert_snapshot(connection: &Connection, snapshot: &Value) -> Result<(), String> {
    for table in TABLES {
        execute(connection, &format!("DELETE FROM {table}"), vec![], false)?;
        let columns = table_columns(connection, table)?;
        let placeholders = columns.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        let query = format!(
            "INSERT INTO {table} ({}) VALUES ({placeholders})",
            columns.join(",")
        );
        for row in snapshot["tables"][*table]["rows"].as_array().unwrap() {
            execute(connection, &query, row.as_array().unwrap().clone(), false)?;
        }
    }
    Ok(())
}

fn normalized_snapshot(snapshot: &Value) -> Value {
    let mut normalized = snapshot.clone();
    for table in TABLES {
        normalized["tables"][*table]["rows"]
            .as_array_mut()
            .unwrap()
            .sort_by_key(Value::to_string);
    }
    normalized
}

fn validate_import(
    connection: &Connection,
    namespace: &str,
    snapshot: &Value,
) -> Result<(), String> {
    validate_capture(connection, namespace, snapshot)?;
    let mut preview =
        Connection::open_in_memory().map_err(|_| "Unable to validate wallet state")?;
    configure(&mut preview)?;
    for table in TABLES {
        let schema: String = connection
            .query_row(
                "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
                [table],
                |row| row.get(0),
            )
            .map_err(|_| "Unable to validate wallet state schema")?;
        preview
            .execute_batch(&schema)
            .map_err(|_| "Unable to validate wallet state schema")?;
    }
    insert_snapshot(&preview, snapshot)?;
    if capture(&preview, namespace)? != normalized_snapshot(snapshot) {
        return Err("Wallet state values do not match their SQLite types".into());
    }
    Ok(())
}

fn require_restore_destination(
    connection: &Connection,
    namespace: &str,
    snapshot: &Value,
) -> Result<bool, String> {
    let current = capture(connection, namespace)?;
    let has_data = TABLES
        .iter()
        .filter(|name| **name != "native_storage_migrations")
        .any(|name| {
            !current["tables"][*name]["rows"]
                .as_array()
                .unwrap()
                .is_empty()
        });
    if has_data && current != normalized_snapshot(snapshot) {
        return Err("Restore requires an empty wallet profile".into());
    }
    Ok(has_data)
}

fn restore_connection(
    connection: &Connection,
    namespace: &str,
    snapshot: &Value,
) -> Result<(), String> {
    if !connection.is_autocommit() {
        return Err("Wait for the active wallet operation before restoring".into());
    }
    connection
        .execute_batch("BEGIN IMMEDIATE")
        .map_err(|_| "Unable to start wallet state restore")?;
    let result = (|| {
        validate_import(connection, namespace, snapshot)?;
        if require_restore_destination(connection, namespace, snapshot)? {
            return Ok(());
        }
        insert_snapshot(connection, snapshot)
    })();
    match result {
        Ok(()) => match connection.execute_batch("COMMIT") {
            Ok(()) => Ok(()),
            Err(_) => {
                let _ = connection.execute_batch("ROLLBACK");
                Err("Unable to commit wallet state restore".into())
            }
        },
        Err(error) => {
            let _ = connection.execute_batch("ROLLBACK");
            Err(error)
        }
    }
}

fn valid_namespace(namespace: &str) -> bool {
    let Some(suffix) = namespace.strip_prefix("arkade-native-") else {
        return false;
    };
    let Some((network, key)) = suffix.split_once('-') else {
        return false;
    };
    matches!(
        network,
        "bitcoin" | "testnet" | "signet" | "mutinynet" | "regtest"
    ) && key.len() == 66
        && (key.starts_with("02") || key.starts_with("03"))
        && key
            .bytes()
            .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
}

fn require_window<R: Runtime>(window: &WebviewWindow<R>) -> Result<(), String> {
    let url = window.url().map_err(|_| "Invalid wallet window")?;
    let local = url.port().is_none()
        && ((url.scheme() == "tauri" && url.host_str() == Some("localhost"))
            || (matches!(url.scheme(), "http" | "https")
                && url.host_str() == Some("tauri.localhost")));
    if window.label() != "main" || !local || !url.username().is_empty() || url.password().is_some()
    {
        return Err("Storage access is restricted to the bundled wallet".into());
    }
    Ok(())
}

fn authorize(context: AuthContext<'_>) -> Authorization {
    match context.action {
        AuthAction::Attach { .. } | AuthAction::Detach { .. } | AuthAction::Unknown { .. } => {
            Authorization::Deny
        }
        AuthAction::Pragma { pragma_name, .. } if pragma_name != "table_info" => {
            Authorization::Deny
        }
        AuthAction::Function { function_name }
            if function_name.eq_ignore_ascii_case("load_extension") =>
        {
            Authorization::Deny
        }
        _ => Authorization::Allow,
    }
}

fn configure(connection: &mut Connection) -> Result<(), String> {
    connection
        .busy_timeout(Duration::from_secs(5))
        .map_err(|_| "Unable to configure wallet storage")?;
    connection
        .execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;")
        .map_err(|_| "Unable to configure wallet storage")?;
    connection
        .authorizer(Some(authorize))
        .map_err(|_| "Unable to restrict wallet storage")?;
    Ok(())
}

impl Databases {
    fn require_no_other_wallet_unlocked(&self, namespace: &str) -> Result<(), String> {
        let entries = match std::fs::read_dir(&self.directory) {
            Ok(entries) => entries,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
            Err(_) => return Err("Unable to inspect existing wallet profiles".into()),
        };
        for entry in entries {
            let path = entry
                .map_err(|_| "Unable to inspect existing wallet profiles")?
                .path();
            if path.extension().and_then(|extension| extension.to_str()) != Some("sqlite") {
                continue;
            }
            let name = path
                .file_stem()
                .and_then(|name| name.to_str())
                .ok_or("Invalid wallet storage file")?;
            if name == namespace {
                continue;
            }
            if !valid_namespace(name) {
                return Err("An unknown wallet profile must be recovered before restoring".into());
            }
            let other = Connection::open_with_flags(&path, OpenFlags::SQLITE_OPEN_READ_ONLY)
                .map_err(|_| "Unable to inspect existing wallet profile")?;
            for table in TABLES
                .iter()
                .filter(|table| **table != "native_storage_migrations")
            {
                let exists: bool = other
                    .query_row(
                        "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name=?)",
                        [table],
                        |row| row.get(0),
                    )
                    .map_err(|_| "Unable to inspect existing wallet profile")?;
                if exists {
                    let populated: bool = other
                        .query_row(
                            &format!("SELECT EXISTS(SELECT 1 FROM {table})"),
                            [],
                            |row| row.get(0),
                        )
                        .map_err(|_| "Unable to inspect existing wallet profile")?;
                    if populated {
                        return Err("Another wallet profile contains data; recover or reset it before restoring".into());
                    }
                }
            }
        }
        Ok(())
    }

    fn require_no_other_wallet(&self, namespace: &str) -> Result<(), String> {
        let connection = self.connection(namespace)?;
        let _guard = connection.lock();
        self.require_no_other_wallet_unlocked(namespace)
    }

    fn connection(&self, namespace: &str) -> Result<Arc<ReentrantMutex<Connection>>, String> {
        if !valid_namespace(namespace) {
            return Err("Invalid wallet storage namespace".into());
        }
        let mut connections = self
            .connections
            .lock()
            .map_err(|_| "Wallet storage unavailable")?;
        if let Some(connection) = connections.get(namespace) {
            return Ok(Arc::clone(connection));
        }
        std::fs::create_dir_all(&self.directory).map_err(|_| "Unable to create wallet storage")?;
        let mut connection = Connection::open(self.directory.join(format!("{namespace}.sqlite")))
            .map_err(|_| "Unable to open wallet storage")?;
        configure(&mut connection)?;
        let connection = Arc::new(ReentrantMutex::new(connection));
        connections.insert(namespace.to_owned(), Arc::clone(&connection));
        Ok(connection)
    }
}

fn parameters(values: Vec<Value>) -> Result<Vec<SqlValue>, String> {
    if values.len() > 32766 {
        return Err("Too many storage parameters".into());
    }
    values
        .into_iter()
        .map(|value| match value {
            Value::Null => Ok(SqlValue::Null),
            Value::Bool(value) => Ok(SqlValue::Integer(i64::from(value))),
            Value::String(value) => Ok(SqlValue::Text(value)),
            Value::Number(value) => {
                if let Some(integer) = value.as_i64() {
                    if integer.unsigned_abs() > 9_007_199_254_740_991 {
                        return Err("Unsafe storage integer".into());
                    }
                    Ok(SqlValue::Integer(integer))
                } else {
                    value
                        .as_f64()
                        .filter(|number| {
                            number.is_finite() && number.abs() <= 9_007_199_254_740_991.0
                        })
                        .map(SqlValue::Real)
                        .ok_or_else(|| "Invalid storage number".into())
                }
            }
            _ => Err("Invalid storage parameter".into()),
        })
        .collect()
}

fn execute(
    connection: &Connection,
    sql: &str,
    values: Vec<Value>,
    select: bool,
) -> Result<Vec<Value>, String> {
    if sql.is_empty() || sql.len() > 2_000_000 {
        return Err("Invalid storage statement".into());
    }
    let values = parameters(values)?;
    let mut statement = connection
        .prepare(sql)
        .map_err(|_| "Unable to prepare wallet storage operation")?;
    if !select {
        statement
            .execute(params_from_iter(values))
            .map_err(|_| "Wallet storage operation failed")?;
        return Ok(Vec::new());
    }
    if !statement.readonly() {
        return Err("Storage reads must be read-only".into());
    }
    let names = statement
        .column_names()
        .into_iter()
        .map(str::to_owned)
        .collect::<Vec<_>>();
    let mut cursor = statement
        .query(params_from_iter(values))
        .map_err(|_| "Wallet storage read failed")?;
    let mut rows = Vec::new();
    while let Some(row) = cursor.next().map_err(|_| "Wallet storage read failed")? {
        let mut object = Map::new();
        for (index, name) in names.iter().enumerate() {
            let value = match row.get_ref(index).map_err(|_| "Invalid storage value")? {
                ValueRef::Null => Value::Null,
                ValueRef::Integer(value) => {
                    if value.unsigned_abs() > 9_007_199_254_740_991 {
                        return Err("Unsafe stored integer".into());
                    }
                    Value::from(value)
                }
                ValueRef::Real(value) => Value::from(value),
                ValueRef::Text(value) => Value::String(
                    std::str::from_utf8(value)
                        .map_err(|_| "Invalid storage text")?
                        .to_owned(),
                ),
                ValueRef::Blob(_) => {
                    return Err("Binary storage values must use the SDK encoding".into())
                }
            };
            object.insert(name.clone(), value);
        }
        rows.push(Value::Object(object));
        if rows.len() > 100_000 {
            return Err("Storage result exceeded the page limit".into());
        }
    }
    Ok(rows)
}

async fn request<R: Runtime>(
    app: AppHandle<R>,
    namespace: String,
    sql: String,
    values: Vec<Value>,
    select: bool,
) -> Result<Vec<Value>, String> {
    let connection = app.state::<Databases>().connection(&namespace)?;
    tauri::async_runtime::spawn_blocking(move || {
        let connection = connection.lock();
        execute(&connection, &sql, values, select)
    })
    .await
    .map_err(|_| "Wallet storage operation interrupted".to_string())?
}

#[tauri::command]
async fn run<R: Runtime>(
    app: AppHandle<R>,
    window: WebviewWindow<R>,
    namespace: String,
    sql: String,
    values: Vec<Value>,
) -> Result<(), String> {
    require_window(&window)?;
    request(app, namespace, sql, values, false).await?;
    Ok(())
}

#[tauri::command]
async fn all<R: Runtime>(
    app: AppHandle<R>,
    window: WebviewWindow<R>,
    namespace: String,
    sql: String,
    values: Vec<Value>,
) -> Result<Vec<Value>, String> {
    require_window(&window)?;
    request(app, namespace, sql, values, true).await
}

#[tauri::command]
async fn snapshot<R: Runtime>(
    app: AppHandle<R>,
    window: WebviewWindow<R>,
    namespace: String,
) -> Result<Value, String> {
    require_window(&window)?;
    let connection = app.state::<Databases>().connection(&namespace)?;
    tauri::async_runtime::spawn_blocking(move || {
        let connection = connection.lock();
        snapshot_connection(&connection, &namespace)
    })
    .await
    .map_err(|_| "Wallet backup interrupted".to_string())?
}

#[tauri::command]
async fn validate_snapshot<R: Runtime>(
    app: AppHandle<R>,
    window: WebviewWindow<R>,
    namespace: String,
    snapshot: Value,
) -> Result<(), String> {
    require_window(&window)?;
    app.state::<Databases>()
        .require_no_other_wallet(&namespace)?;
    let connection = app.state::<Databases>().connection(&namespace)?;
    tauri::async_runtime::spawn_blocking(move || {
        let connection = connection.lock();
        if !connection.is_autocommit() {
            return Err("Wait for the active wallet operation before restoring".into());
        }
        validate_import(&connection, &namespace, &snapshot)?;
        require_restore_destination(&connection, &namespace, &snapshot).map(|_| ())
    })
    .await
    .map_err(|_| "Wallet backup validation interrupted".to_string())?
}

#[tauri::command]
async fn restore<R: Runtime>(
    app: AppHandle<R>,
    window: WebviewWindow<R>,
    namespace: String,
    snapshot: Value,
) -> Result<(), String> {
    require_window(&window)?;
    app.state::<Databases>()
        .require_no_other_wallet(&namespace)?;
    let connection = app.state::<Databases>().connection(&namespace)?;
    tauri::async_runtime::spawn_blocking(move || {
        let connection = connection.lock();
        restore_connection(&connection, &namespace, &snapshot)
    })
    .await
    .map_err(|_| "Wallet restore interrupted".to_string())?
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    tauri::plugin::Builder::new("wallet-sql")
        .invoke_handler(tauri::generate_handler![
            run,
            all,
            snapshot,
            validate_snapshot,
            restore
        ])
        .setup(|app, _| {
            app.manage(Databases {
                directory: app.path().app_local_data_dir()?.join("wallets"),
                connections: std::sync::Mutex::new(HashMap::new()),
            });
            Ok(())
        })
        .build()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn backup_database(namespace: &str) -> Connection {
        let mut connection = Connection::open_in_memory().unwrap();
        configure(&mut connection).unwrap();
        for table in TABLES
            .iter()
            .filter(|table| **table != "native_storage_migrations")
        {
            execute(
                &connection,
                &format!("CREATE TABLE {table} (id TEXT PRIMARY KEY, payload TEXT)"),
                vec![],
                false,
            )
            .unwrap();
        }
        execute(
            &connection,
            "CREATE TABLE native_storage_migrations (source TEXT PRIMARY KEY, receipt TEXT)",
            vec![],
            false,
        )
        .unwrap();
        execute(
            &connection,
            "INSERT INTO native_storage_migrations VALUES (?,?)",
            vec![
                json!(namespace),
                json!(json!({"version":1,"digest":"ab".repeat(32),"addresses":0}).to_string()),
            ],
            false,
        )
        .unwrap();
        connection
    }

    #[test]
    fn snapshot_restores_all_tables_and_allows_an_identical_retry() {
        let namespace = format!("arkade-native-mutinynet-02{}", "ab".repeat(32));
        let source = backup_database(&namespace);
        execute(
            &source,
            "INSERT INTO ark_contracts VALUES (?,?)",
            vec![json!("contract"), json!("indispensable claim preimage")],
            false,
        )
        .unwrap();
        execute(
            &source,
            "INSERT INTO ark_intents VALUES (?,?)",
            vec![json!("pending"), json!("proof")],
            false,
        )
        .unwrap();
        let snapshot = snapshot_connection(&source, &namespace).unwrap();
        let destination = backup_database(&namespace);
        restore_connection(&destination, &namespace, &snapshot).unwrap();
        assert_eq!(
            snapshot_connection(&destination, &namespace).unwrap(),
            snapshot
        );
        restore_connection(&destination, &namespace, &snapshot).unwrap();
        execute(
            &destination,
            "INSERT INTO ark_utxos VALUES (?,?)",
            vec![json!("new payment"), json!("value")],
            false,
        )
        .unwrap();
        assert!(restore_connection(&destination, &namespace, &snapshot).is_err());
        assert_eq!(
            execute(
                &destination,
                "SELECT COUNT(*) AS count FROM ark_utxos",
                vec![],
                true
            )
            .unwrap(),
            vec![json!({"count":1})]
        );
    }

    #[test]
    fn backup_validates_schema_namespace_and_values_before_any_import() {
        let namespace = format!("arkade-native-mutinynet-02{}", "ab".repeat(32));
        let connection = backup_database(&namespace);
        let baseline = snapshot_connection(&connection, &namespace).unwrap();
        for bad in [
            {
                let mut value = baseline.clone();
                value["namespace"] = json!("another wallet");
                value
            },
            {
                let mut value = baseline.clone();
                value["tables"]["ark_contracts"]["columns"][0] =
                    json!("id);DROP TABLE ark_utxos;--");
                value
            },
            {
                let mut value = baseline.clone();
                value["tables"]["ark_contracts"]["rows"] = json!([["key", {"not":"scalar"}]]);
                value
            },
            {
                let mut value = baseline.clone();
                value["tables"]["arbitrary_sql"] = json!({"columns":[],"rows":[]});
                value
            },
            {
                let mut value = baseline.clone();
                value["tables"]["ark_contracts"]["rows"] =
                    json!([["duplicate", "one"], ["duplicate", "two"]]);
                value
            },
            {
                let mut value = baseline.clone();
                value["tables"]["ark_contracts"]["rows"] = json!([[123, "wrong SQLite affinity"]]);
                value
            },
        ] {
            assert!(validate_import(&connection, &namespace, &bad).is_err());
            assert!(restore_connection(&connection, &namespace, &bad).is_err());
            assert_eq!(
                snapshot_connection(&connection, &namespace).unwrap(),
                baseline
            );
        }
    }

    #[test]
    fn failed_backup_import_rolls_back_every_preceding_table() {
        let namespace = format!("arkade-native-mutinynet-02{}", "ab".repeat(32));
        let connection = backup_database(&namespace);
        let baseline = snapshot_connection(&connection, &namespace).unwrap();
        let mut bad = baseline.clone();
        bad["tables"]["ark_vtxos"]["rows"] = json!([["first", "copied first"]]);
        bad["tables"]["ark_contracts"]["rows"] =
            json!([["reject", "failure after preceding tables"]]);
        connection.execute_batch("CREATE TRIGGER fail_import BEFORE INSERT ON ark_contracts WHEN NEW.id='reject' BEGIN SELECT RAISE(ABORT,'injected failure'); END;").unwrap();
        assert!(validate_import(&connection, &namespace, &bad).is_ok());
        assert!(restore_connection(&connection, &namespace, &bad).is_err());
        assert_eq!(
            snapshot_connection(&connection, &namespace).unwrap(),
            baseline
        );
        assert!(connection.is_autocommit());
    }

    #[test]
    fn backup_cannot_capture_or_restore_an_inflight_transaction() {
        let namespace = format!("arkade-native-mutinynet-02{}", "ab".repeat(32));
        let connection = backup_database(&namespace);
        let baseline = snapshot_connection(&connection, &namespace).unwrap();
        execute(&connection, "BEGIN IMMEDIATE", vec![], false).unwrap();
        assert!(snapshot_connection(&connection, &namespace).is_err());
        assert!(restore_connection(&connection, &namespace, &baseline).is_err());
        execute(&connection, "ROLLBACK", vec![], false).unwrap();
    }

    #[test]
    fn namespaces_cannot_escape_or_mix_networks() {
        assert!(valid_namespace(&format!(
            "arkade-native-mutinynet-02{}",
            "ab".repeat(32)
        )));
        for name in [
            "../wallet",
            "arkade-native-bitcoin-../../elsewhere",
            "arkade-native-mainnet-02ab",
            "arkade-native-mutinynet-04ab",
        ] {
            assert!(!valid_namespace(name));
        }
    }

    #[test]
    fn bound_values_and_rollback_use_one_connection() {
        let mut connection = Connection::open_in_memory().unwrap();
        configure(&mut connection).unwrap();
        execute(
            &connection,
            "CREATE TABLE records (id TEXT PRIMARY KEY, payload TEXT)",
            vec![],
            false,
        )
        .unwrap();
        execute(&connection, "BEGIN IMMEDIATE", vec![], false).unwrap();
        execute(
            &connection,
            "INSERT INTO records VALUES (?, ?)",
            vec![json!("id' OR 1=1--"), json!("private payload")],
            false,
        )
        .unwrap();
        assert_eq!(
            execute(
                &connection,
                "SELECT COUNT(*) AS count FROM records",
                vec![],
                true
            )
            .unwrap(),
            vec![json!({"count": 1})]
        );
        execute(&connection, "ROLLBACK", vec![], false).unwrap();
        assert_eq!(
            execute(&connection, "SELECT * FROM records", vec![], true).unwrap(),
            Vec::<Value>::new()
        );
        execute(&connection, "BEGIN IMMEDIATE", vec![], false).unwrap();
        execute(
            &connection,
            "INSERT INTO records VALUES (?, ?)",
            vec![json!("saved"), json!("value")],
            false,
        )
        .unwrap();
        execute(&connection, "COMMIT", vec![], false).unwrap();
        assert_eq!(
            execute(
                &connection,
                "SELECT payload FROM records WHERE id = ?",
                vec![json!("saved")],
                true
            )
            .unwrap(),
            vec![json!({"payload": "value"})]
        );
    }

    #[test]
    fn storage_cannot_attach_files_or_change_safety_pragmas() {
        let mut connection = Connection::open_in_memory().unwrap();
        configure(&mut connection).unwrap();
        assert!(execute(
            &connection,
            "ATTACH DATABASE ? AS outside",
            vec![json!(":memory:")],
            false
        )
        .is_err());
        assert!(execute(&connection, "PRAGMA synchronous=OFF", vec![], false).is_err());
        assert!(execute(&connection, "PRAGMA table_info(missing)", vec![], true).is_ok());
        assert!(parameters(vec![json!({"key":"not a scalar"})]).is_err());
        assert!(parameters(vec![json!(9_007_199_254_740_992_i64)]).is_err());
    }

    #[test]
    fn restore_holds_destination_lock_while_other_namespace_becomes_live() {
        let namespace = format!("arkade-native-mutinynet-02{}", "ab".repeat(32));
        let other_namespace = format!("arkade-native-regtest-02{}", "ab".repeat(32));
        let directory = std::env::temp_dir().join(format!("arkade-sql-race-{}-{}", std::process::id(),
            std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
        let databases = Databases { directory: directory.clone(), connections: std::sync::Mutex::new(HashMap::new()) };
        let source = backup_database(&namespace);
        let snapshot = snapshot_connection(&source, &namespace).unwrap();
        let connection = databases.connection(&other_namespace).unwrap();
        let other_connection = connection.lock();
        execute(&other_connection, "CREATE TABLE ark_wallet_state (payload TEXT)", vec![], false).unwrap();
        execute(&other_connection, "INSERT INTO ark_wallet_state VALUES (?)", vec![json!("other wallet live")], false).unwrap();
        assert!(databases.require_no_other_wallet(&namespace).is_err());
        drop(other_connection);
        drop(connection);
        drop(databases);
        drop(snapshot);
        drop(source);
        std::fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn native_files_survive_reopen_and_are_isolated_by_network_and_key() {
        let directory = std::env::temp_dir().join(format!(
            "arkade-sql-test-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let namespace = format!("arkade-native-mutinynet-02{}", "ab".repeat(32));
        let other_namespace = format!("arkade-native-regtest-02{}", "ab".repeat(32));
        {
            let databases = Databases {
                directory: directory.clone(),
                connections: std::sync::Mutex::new(HashMap::new()),
            };
            let first = databases.connection(&namespace).unwrap();
            assert!(Arc::ptr_eq(
                &first,
                &databases.connection(&namespace).unwrap()
            ));
            let first = first.lock();
            execute(
                &first,
                "CREATE TABLE ark_wallet_state (payload TEXT)",
                vec![],
                false,
            )
            .unwrap();
            execute(
                &first,
                "INSERT INTO ark_wallet_state VALUES (?)",
                vec![json!("persisted")],
                false,
            )
            .unwrap();
            let other = databases.connection(&other_namespace).unwrap();
            assert!(execute(
                &other.lock(),
                "SELECT * FROM ark_wallet_state",
                vec![],
                true
            )
            .is_err());
            assert!(databases.require_no_other_wallet(&namespace).is_ok());
            assert!(databases.require_no_other_wallet(&other_namespace).is_err());
        }
        {
            let databases = Databases {
                directory: directory.clone(),
                connections: std::sync::Mutex::new(HashMap::new()),
            };
            let connection = databases.connection(&namespace).unwrap();
            assert_eq!(
                execute(
                    &connection.lock(),
                    "SELECT * FROM ark_wallet_state",
                    vec![],
                    true
                )
                .unwrap(),
                vec![json!({"payload": "persisted"})]
            );
        }
        std::fs::remove_dir_all(&directory).unwrap();
    }
}
