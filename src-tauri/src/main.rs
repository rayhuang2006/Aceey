#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod compiler;
mod calendar;
mod debug_agent;

use compiler::{TestCase, TestResult};

#[tauri::command]
async fn compile_and_run(
    source_code: String,
    test_cases: Vec<TestCase>,
    time_limit_ms: Option<u64>,
) -> Result<Vec<TestResult>, String> {
    let limit = time_limit_ms.unwrap_or(2000);
    compiler::compile_and_run(&source_code, test_cases, limit).await
}

#[tauri::command]
fn get_env_vars() -> std::collections::HashMap<String, String> {
    let mut map = std::collections::HashMap::new();
    let _ = dotenvy::dotenv();
    for (key, value) in std::env::vars() {
        if key.starts_with("VITE_") || key.ends_with("_API_KEY") || key.ends_with("_USERNAME") {
            map.insert(key, value);
        }
    }
    map
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            compile_and_run, 
            calendar::fetch_contests,
            calendar::generate_training_plan,
            debug_agent::analyze_error,
            debug_agent::get_agent_memory,
            debug_agent::clear_agent_memory,
            get_env_vars
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
