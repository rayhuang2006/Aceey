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
pub async fn generate_training_plan(
    contest_name: String,
    contest_platform: String,
    _contest_date: String,
    days_until: i64,
    user_level: String,
) -> Result<String, String> {
    let _ = dotenvy::from_path("../.env");
    let key = env::var("GROQ_API_KEY").map_err(|_| "Missing GROQ_API_KEY".to_string())?;

    let prompt = format!(
        "You are a competitive programming coach. Respond in Traditional Chinese (繁體中文).\n\nA student (level: {}) wants to prepare for \"{}\" on {} in {} days.\n\nCreate a 5-day practice plan using ONLY problems from the CSES Problem Set (cses.fi). These are real CSES problems you must use:\n\nSorting: Distinct Numbers, Apartments, Ferris Wheel, Concert Tickets, Restaurant Customers, Movie Festival, Sum of Two Values, Collecting Numbers, Playlist\nGreedy: Stick Lengths, Missing Coin Sum, Tasks and Deadlines, Movie Festival II\nDP: Dice Combinations, Minimizing Coins, Coin Combinations I, Coin Combinations II, Removing Digits, Grid Paths, Book Shop, Array Description, Counting Towers, Edit Distance\nGraph: Counting Rooms, Labyrinth, Building Roads, Message Route, Building Teams, Round Trip, Shortest Routes I, Shortest Routes II, Flight Discount\nMath: Exponentiation, Counting Divisors, Counting Divisors, Common Divisors, Sum of Divisors, Binomial Coefficients\n\nPick problems appropriate for the student's level. For each day, suggest 2-3 problems.\n\nOutput format (STRICTLY one problem per line, NO other text):\nDAY 1|problem_name|task_id|topic_tag|difficulty\nDAY 1|problem_name|task_id|topic_tag|difficulty\nDAY 2|problem_name|task_id|topic_tag|difficulty\n\nWhere task_id is the CSES problem ID number (e.g. Distinct Numbers = 1621, Dice Combinations = 1633, Counting Rooms = 1748). You MUST provide the correct CSES task ID for each problem.",
        user_level,
        contest_name,
        contest_platform,
        days_until
    );

    println!("GROQ PROMPT: {}", prompt);

    let body = serde_json::json!({
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_completion_tokens": 1024,
    });

    let body_str = serde_json::to_string(&body).map_err(|e| format!("JSON error: {}", e))?;

    let output = std::process::Command::new("curl")
        .arg("-s")
        .arg("https://api.groq.com/openai/v1/chat/completions")
        .arg("-H")
        .arg(format!("Authorization: Bearer {}", key))
        .arg("-H")
        .arg("Content-Type: application/json")
        .arg("-d")
        .arg(&body_str)
        .output()
        .map_err(|e| format!("Failed to curl groq API: {}", e))?;

    if !output.status.success() {
        return Err(format!("curl groq returned error status: {:?}", output.status));
    }

    let response_str = String::from_utf8(output.stdout).unwrap_or_default();
    
    // Parse the JSON response
    let parsed: serde_json::Value = serde_json::from_str(&response_str)
        .map_err(|e| format!("Failed to parse response JSON: {}", e))?;

    let content = parsed["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("No suggestion returned.")
        .to_string();

    println!("GROQ RAW RESPONSE: {}", content);

    Ok(content)
}
