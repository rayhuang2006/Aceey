#[tauri::command]
pub async fn get_agent_memory() -> Result<Vec<String>, String> {
    let memory_file = ".aceey_memory.json";
    if std::path::Path::new(memory_file).exists() {
        if let Ok(contents) = std::fs::read_to_string(memory_file) {
            if let Ok(parsed) = serde_json::from_str::<Vec<String>>(&contents) {
                return Ok(parsed);
            }
        }
    }
    Ok(vec![])
}

#[tauri::command]
pub async fn clear_agent_memory() -> Result<(), String> {
    let memory_file = ".aceey_memory.json";
    let empty: Vec<String> = vec![];
    if let Ok(json) = serde_json::to_string(&empty) {
        if std::fs::write(memory_file, json).is_ok() {
            return Ok(());
        }
    }
    Err("無法清除記憶檔案".to_string())
}

#[tauri::command]
pub async fn analyze_error(
    source_code: String,
    problem_description: String,
    error_type: String,
    compiler_output: String,
    test_input: String,
    expected_output: String,
    actual_output: String,
    groq_api_key: String,
) -> Result<String, String> {
    let memory_file = ".aceey_memory.json";
    let mut error_history: Vec<String> = vec![];
    
    if std::path::Path::new(memory_file).exists() {
        if let Ok(contents) = std::fs::read_to_string(memory_file) {
            if let Ok(parsed) = serde_json::from_str::<Vec<String>>(&contents) {
                error_history = parsed;
                println!("🧠 從本地檔案讀取到歷史記憶: {:?}", error_history);
            }
        }
    }

    let numbered_code: String = source_code
        .lines()
        .enumerate()
        .map(|(i, line)| format!("{}: {}", i + 1, line))
        .collect::<Vec<_>>()
        .join("\n");

    let prompt = format!(
        "Error type: {}\nCompiler/runtime output: {}\n\nProblem description:\n{}\n\nSource code (line numbers are shown at the beginning of each line):\n{}\n\nTest input: {}\nExpected output: {}\nActual output: {}",
        error_type,
        compiler_output,
        problem_description,
        numbered_code,
        test_input,
        expected_output,
        actual_output
    );

    let history_context = if error_history.is_empty() {
        println!("🧠 檢測到空的歷史記憶");
        "".to_string()
    } else {
        let tags_str = error_history.join(", ");
        println!("🧠 準備將此歷史記憶加入 Prompt: {:?}", tags_str);
        format!("歷史記憶：該使用者近期常犯的錯誤標籤包含 [{}]，請在分析時將此納入考量。\n\n", tags_str)
    };

    let system_instructions = format!("You are a competitive programming debugging assistant. Respond in Traditional Chinese (繁體中文).\n\n\
{}A student's C++ code has an error. \n\n\
IMPORTANT: The line numbers at the beginning of each line in the source code are already correct. Use THOSE exact numbers. Do NOT count lines yourself.\n\n\
Respond ONLY in this format, one issue per line, maximum 3 lines:\n\
LINE|line_number|description|suggestion|error_tag\n\n\
Where:\n\
- LINE is the literal word \"LINE\"\n\
- line_number is the line number in the source code where the error is (integer)\n\
- description is a brief explanation of what's wrong (1 sentence, in Traditional Chinese)\n\
- suggestion is how to fix it (1 sentence, in Traditional Chinese)\n\
- error_tag is a short tag categorizing the error (e.g., Integer Overflow, Out of Bounds, Logic Error)\n\n\
If the error is a general logic problem not tied to one line, use 0 as line_number.", history_context);

    let body = serde_json::json!({
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_instructions},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 300
    });

    let body_str = serde_json::to_string(&body).map_err(|e| format!("JSON error: {}", e))?;

    let output = std::process::Command::new("curl")
        .arg("-s")
        .arg("-X").arg("POST")
        .arg("https://api.groq.com/openai/v1/chat/completions")
        .arg("-H").arg(format!("Authorization: Bearer {}", groq_api_key.trim()))
        .arg("-H").arg("Content-Type: application/json")
        .arg("-d").arg(&body_str)
        .output()
        .map_err(|e| format!("curl failed: {}", e))?;

    if !output.status.success() {
        return Err(format!("curl groq returned error status: {:?}", output.status));
    }

    let response_str = String::from_utf8(output.stdout).unwrap_or_default();
    println!("DEBUG AGENT RAW RESPONSE: {}", response_str);
    
    // Parse the JSON response
    let parsed: serde_json::Value = serde_json::from_str(&response_str)
        .map_err(|e| format!("Failed to parse response JSON: {} | Raw: {}", e, response_str))?;

    if let Some(error) = parsed.get("error") {
        return Err(format!("Groq API Error: {}", error));
    }

    let content = parsed["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .to_string();

    println!("DEBUG AGENT EXTRACTED CONTENT: |{}|", content);

    // Write back new tags to memory
    let mut new_tags = vec![];
    for line in content.lines() {
        if line.starts_with("LINE|") {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 5 {
                let tag = parts[4].trim().to_string();
                if !tag.is_empty() {
                    new_tags.push(tag);
                }
            }
        }
    }

    if !new_tags.is_empty() {
        error_history.extend(new_tags);
        if error_history.len() > 20 {
            let len = error_history.len();
            error_history = error_history.into_iter().skip(len - 20).collect();
        }
        if let Ok(json) = serde_json::to_string(&error_history) {
            if std::fs::write(memory_file, json).is_ok() {
                println!("💾 已將記憶寫入本地檔案 .aceey_memory.json: {:?}", error_history);
            } else {
                println!("⚠️ 無法寫入本地記憶檔案 .aceey_memory.json");
            }
        }
    }

    Ok(content)
}
