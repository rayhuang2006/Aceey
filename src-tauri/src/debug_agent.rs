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

    let system_instructions = "You are a competitive programming debugging assistant. Respond in Traditional Chinese (繁體中文).\n\n\
A student's C++ code has an error. \n\n\
IMPORTANT: The line numbers at the beginning of each line in the source code are already correct. Use THOSE exact numbers. Do NOT count lines yourself.\n\n\
Respond ONLY in this format, one issue per line, maximum 3 lines:\n\
LINE|line_number|description|suggestion\n\n\
Where:\n\
- LINE is the literal word \"LINE\"\n\
- line_number is the line number in the source code where the error is (integer)\n\
- description is a brief explanation of what's wrong (1 sentence, in Traditional Chinese)\n\
- suggestion is how to fix it (1 sentence, in Traditional Chinese)\n\n\
If the error is a general logic problem not tied to one line, use 0 as line_number.";

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

    Ok(content)
}
