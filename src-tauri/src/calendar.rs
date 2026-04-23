use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Deserialize)]
struct ClistContest {
    event: String,
    start: String,
    end: String,
    duration: f64,
    href: String,
    resource: String,
}

#[derive(Debug, Deserialize)]
struct ClistResponse {
    objects: Vec<ClistContest>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Contest {
    pub name: String,
    pub platform: String,
    pub start_time: String,
    pub end_time: String,
    pub duration_minutes: u64,
    pub url: String,
}

#[tauri::command]
pub async fn fetch_contests() -> Result<Vec<Contest>, String> {
    let _ = dotenvy::from_path("../.env");
    let user = env::var("CLIST_USERNAME").map_err(|_| "Missing CLIST_USERNAME".to_string())?;
    let key = env::var("CLIST_API_KEY").map_err(|_| "Missing CLIST_API_KEY".to_string())?;

    let url = format!(
        "https://clist.by/api/v4/contest/?upcoming=true&order_by=start&limit=50&format=json&resource__in=codeforces.com,atcoder.jp,leetcode.com,codechef.com&username={}&api_key={}",
        user.trim(), key.trim()
    );

    let output = std::process::Command::new("curl")
        .arg("-s")
        .arg(&url)
        .output()
        .map_err(|e| format!("curl failed: {}", e))?;

    let body = String::from_utf8_lossy(&output.stdout).to_string();

    let clist: ClistResponse = serde_json::from_str(&body)
        .map_err(|e| format!("JSON parse error: {} - Raw response: {}", e, body))?;

    let contests = clist.objects.into_iter().map(|c| Contest {
        name: c.event,
        platform: c.resource,
        start_time: c.start,
        end_time: c.end,
        duration_minutes: (c.duration / 60.0) as u64,
        url: c.href,
    }).collect();

    Ok(contests)
}

#[tauri::command]
pub async fn get_practice_suggestion(contests: Vec<Contest>, days_until: i64) -> Result<String, String> {
    let _ = dotenvy::from_path("../.env");
    let api_key = env::var("GROQ_API_KEY").map_err(|_| "Missing GROQ_API_KEY".to_string())?;

    let contest_info: Vec<String> = contests.iter().map(|c| {
        format!("{} on {} ({}min)", c.name, c.platform, c.duration_minutes)
    }).collect();

    let prompt = format!(
        "You are a competitive programming coach. Respond in Traditional Chinese (繁體中文). A student has these contests coming up in {} days:\n{}\n\nGive a brief, actionable practice suggestion (2-3 bullet points max). Focus on what topics to practice based on the contest platform and format. Be specific about algorithm topics. Keep it under 80 words. Do NOT use markdown formatting.",
        days_until,
        contest_info.join("\n")
    );

    let body = serde_json::json!({
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "You are a helpful competitive programming coach. Always respond in Traditional Chinese (繁體中文). Be concise and specific."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 200
    });

    let output = std::process::Command::new("curl")
        .arg("-s")
        .arg("-X").arg("POST")
        .arg("https://api.groq.com/openai/v1/chat/completions")
        .arg("-H").arg(format!("Authorization: Bearer {}", api_key.trim()))
        .arg("-H").arg("Content-Type: application/json")
        .arg("-d").arg(body.to_string())
        .output()
        .map_err(|e| format!("curl failed: {}", e))?;

    let body_str = String::from_utf8_lossy(&output.stdout).to_string();
    let response: serde_json::Value = serde_json::from_str(&body_str)
        .map_err(|e| format!("JSON parse error on Groq response: {}", e))?;

    let message = response["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("Could not generate suggestion. Please try again.")
        .to_string();

    Ok(message)
}
