use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use walkdir::{DirEntry, WalkDir};

#[derive(Debug, Serialize, Deserialize)]
pub struct VaultConfig {
    pub root_path: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub path: String, // relative to vault root
    pub is_dir: bool,
}

// Helper to check if entry is hidden
fn is_hidden(entry: &DirEntry) -> bool {
    entry
        .file_name()
        .to_str()
        .map(|s| s.starts_with('.'))
        .unwrap_or(false)
}

// Helper to get path to vault.json
fn get_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    }
    Ok(config_dir.join("vault.json"))
}

#[tauri::command]
pub fn get_vault_config(app: AppHandle) -> Option<VaultConfig> {
    let config_path = get_config_path(&app).ok()?;
    let content = fs::read_to_string(config_path).ok()?;
    serde_json::from_str(&content).ok()
}

#[tauri::command]
pub fn set_vault_config(app: AppHandle, root_path: String, name: String) -> Result<(), String> {
    let config_path = get_config_path(&app)?;
    let config = VaultConfig { root_path, name };
    let content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(config_path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn reset_vault_config(app: AppHandle) -> Result<(), String> {
    let config_path = get_config_path(&app)?;
    if config_path.exists() {
        fs::remove_file(config_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn list_markdown_files(app: AppHandle) -> Result<Vec<FileEntry>, String> {
    // Read config to get root path
    let config = get_vault_config(app.clone()).ok_or("No vault configured".to_string())?;
    let root = Path::new(&config.root_path);

    if !root.exists() {
        return Err("Vault root does not exist".to_string());
    }

    let mut entries = Vec::new();

    // Walkdir with filter for hidden files
    let walker = WalkDir::new(root).into_iter().filter_entry(|e| !is_hidden(e));

    for entry in walker {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        // Skip root itself
        if path == root {
            continue;
        }

        // Get relative path
        let relative_path = path
            .strip_prefix(root)
            .map_err(|e| e.to_string())?
            .to_string_lossy()
            .replace("\\", "/"); // Normalize separators for consistency

        let is_dir = entry.file_type().is_dir();

        if is_dir {
            entries.push(FileEntry {
                path: relative_path,
                is_dir: true,
            });
        } else if let Some(ext) = path.extension() {
            if ext == "md" {
                entries.push(FileEntry {
                    path: relative_path,
                    is_dir: false,
                });
            }
        }
    }

    // Sort entries by path
    entries.sort_by(|a, b| a.path.cmp(&b.path));

    Ok(entries)
}
