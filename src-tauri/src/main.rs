#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod compiler;
mod calendar;

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

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            compile_and_run, 
            calendar::fetch_contests,
            calendar::generate_training_plan
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
