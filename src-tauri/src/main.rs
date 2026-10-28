#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Serialize, Deserialize, Clone)]
pub struct FeedResponse {
    pub url: String,
    pub status: u16,
    pub body: String,
    pub ok: bool,
}

#[tauri::command]
async fn fetch_url_text(url: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .user_agent("RadiantKepler/1.0 (macOS Desktop Market Intelligence)")
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let text = resp.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

#[tauri::command]
async fn fetch_multi_feeds(urls: Vec<String>) -> Result<Vec<FeedResponse>, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(9))
        .user_agent("RadiantKepler/1.0 (macOS Desktop Market Intelligence)")
        .build()
        .map_err(|e| e.to_string())?;

    let mut handles = Vec::with_capacity(urls.len());
    for url in urls {
        let c = client.clone();
        handles.push(tokio::spawn(async move {
            match c.get(&url).send().await {
                Ok(resp) => {
                    let status = resp.status().as_u16();
                    let ok = resp.status().is_success();
                    let body = resp.text().await.unwrap_or_default();
                    FeedResponse {
                        url,
                        status,
                        body,
                        ok,
                    }
                }
                Err(err) => FeedResponse {
                    url,
                    status: 0,
                    body: err.to_string(),
                    ok: false,
                },
            }
        }));
    }

    let mut results = Vec::with_capacity(handles.len());
    for h in handles {
        if let Ok(res) = h.await {
            results.push(res);
        }
    }
    Ok(results)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![fetch_url_text, fetch_multi_feeds])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
