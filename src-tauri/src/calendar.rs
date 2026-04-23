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

#[derive(Debug, Serialize, Clone)]
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
