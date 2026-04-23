use serde::{Deserialize, Serialize};
use std::fs;
use std::process::Stdio;
use std::time::Duration;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;
use tokio::time::timeout;

#[derive(Debug, Deserialize, Serialize)]
pub struct TestCase {
    pub input: String,
    pub expected_output: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TestResult {
    pub verdict: String,
    pub actual_output: String,
    pub time_ms: u64,
    pub error_message: Option<String>,
}

pub async fn compile_and_run(
    source_code: &str,
    test_cases: Vec<TestCase>,
    time_limit_ms: u64,
) -> Result<Vec<TestResult>, String> {
    let cpp_file = "/tmp/aceey_solution.cpp";
    let exe_file = "/tmp/aceey_solution";

    // Write source code
    if let Err(e) = fs::write(cpp_file, source_code) {
        return Err(format!("Failed to write source code: {}", e));
    }

    // Compile
    let compile_output = Command::new("g++")
        .args(&["-std=c++17", "-O2", "-o", exe_file, cpp_file])
        .output()
        .await
        .map_err(|e| format!("Failed to execute g++: {}", e))?;

    if !compile_output.status.success() {
        let stderr = String::from_utf8_lossy(&compile_output.stderr).to_string();
        // Since we need to return CE for all test cases or just return it as a string error.
        // Wait, the API says returning Result<Vec<TestResult>, String>. We could parse CE as an Err or
        // as a successful execution but with a specific payload. Let's return Err to keep it simple,
        // or actually, if we want to return it gracefully:
        // Let's create a single CE TestResult.
        // To be safer according to standard prompt: "If compilation fails, return { verdict: "CE", message: <compiler error> }"
        // But the return type is Result<Vec<TestResult>, String>.
        // Let's just return Ok with a single element representing CE.
        return Ok(vec![TestResult {
            verdict: "CE".to_string(),
            actual_output: "".to_string(),
            time_ms: 0,
            error_message: Some(stderr),
        }]);
    }

    // Run test cases
    let mut results = Vec::new();

    for tc in test_cases {
        let start = std::time::Instant::now();
        
        let mut child = Command::new(exe_file)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true)
            .spawn()
            .map_err(|e| format!("Failed to spawn process: {}", e))?;

        if let Some(mut stdin) = child.stdin.take() {
            let _ = stdin.write_all(tc.input.as_bytes()).await;
        }

        let run_result = timeout(Duration::from_millis(time_limit_ms), child.wait_with_output()).await;
        let time_ms = start.elapsed().as_millis() as u64;

        match run_result {
            Ok(Ok(output)) => {
                let actual = String::from_utf8_lossy(&output.stdout).to_string();
                let is_ac = actual.trim() == tc.expected_output.trim();
                let verdict = if !output.status.success() {
                    "RE"
                } else if is_ac {
                    "AC"
                } else {
                    "WA"
                };

                results.push(TestResult {
                    verdict: verdict.to_string(),
                    actual_output: actual,
                    time_ms,
                    error_message: if output.status.success() { None } else { Some(String::from_utf8_lossy(&output.stderr).to_string()) },
                });
            }
            Ok(Err(e)) => {
                results.push(TestResult {
                    verdict: "RE".to_string(),
                    actual_output: "".to_string(),
                    time_ms,
                    error_message: Some(e.to_string()),
                });
            }
            Err(_) => {
                results.push(TestResult {
                    verdict: "TLE".to_string(),
                    actual_output: "".to_string(),
                    time_ms: time_limit_ms,
                    error_message: None,
                });
            }
        }
    }

    Ok(results)
}
