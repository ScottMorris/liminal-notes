use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Component, Path, PathBuf};
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
    pub mtime: Option<u64>,
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

// Helper to safely resolve a relative path within the vault root
fn resolve_safe_path(root: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let path = Path::new(relative_path);
    if path.is_absolute() {
        return Err("Path must be relative".to_string());
    }

    // Check for path traversal attempts
    for component in path.components() {
        match component {
            Component::Normal(_) => {},
            Component::CurDir => {}, // '.' is fine
            _ => return Err(format!("Invalid path component in '{}': only normal components allowed", relative_path)),
        }
    }

    Ok(root.join(path))
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

        let mtime = entry.metadata()
             .ok()
             .and_then(|m| m.modified().ok())
             .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
             .map(|d| d.as_millis() as u64);

        if is_dir {
            entries.push(FileEntry {
                path: relative_path,
                is_dir: true,
                mtime: None,
            });
        } else if let Some(ext) = path.extension() {
            if ext == "md" {
                entries.push(FileEntry {
                    path: relative_path,
                    is_dir: false,
                    mtime,
                });
            }
        }
    }

    // Sort entries by path
    entries.sort_by(|a, b| a.path.cmp(&b.path));

    Ok(entries)
}

#[tauri::command]
pub fn read_note_command(app: AppHandle, relative_path: String) -> Result<String, String> {
    let config = get_vault_config(app.clone()).ok_or("No vault configured".to_string())?;
    let root = Path::new(&config.root_path);

    if !root.exists() {
        return Err("Vault root does not exist".to_string());
    }

    let full_path = resolve_safe_path(root, &relative_path)?;

    if !full_path.exists() {
        return Err("File does not exist".to_string());
    }

    fs::read_to_string(full_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_note_command(app: AppHandle, relative_path: String, contents: String) -> Result<(), String> {
    let config = get_vault_config(app.clone()).ok_or("No vault configured".to_string())?;
    let root = Path::new(&config.root_path);

    if !root.exists() {
        return Err("Vault root does not exist".to_string());
    }

    let full_path = resolve_safe_path(root, &relative_path)?;

    // Create parent directories if needed
    if let Some(parent) = full_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }

    fs::write(full_path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename_item(app: AppHandle, old_path: String, new_path: String) -> Result<(), String> {
    let config = get_vault_config(app.clone()).ok_or("No vault configured".to_string())?;
    let root = Path::new(&config.root_path);

    if !root.exists() {
        return Err("Vault root does not exist".to_string());
    }

    let full_old_path = resolve_safe_path(root, &old_path)?;
    let full_new_path = resolve_safe_path(root, &new_path)?;

    if !full_old_path.exists() {
        return Err("Source item does not exist".to_string());
    }

    if full_new_path.exists() {
        return Err("Destination item already exists".to_string());
    }

    // Create parent directories for new path if needed
    if let Some(parent) = full_new_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }

    fs::rename(full_old_path, full_new_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_item(app: AppHandle, path: String) -> Result<(), String> {
    let config = get_vault_config(app.clone()).ok_or("No vault configured".to_string())?;
    let root = Path::new(&config.root_path);

    if !root.exists() {
        return Err("Vault root does not exist".to_string());
    }

    let full_path = resolve_safe_path(root, &path)?;

    if !full_path.exists() {
        return Err("Item does not exist".to_string());
    }

    if full_path.is_dir() {
        fs::remove_dir_all(full_path).map_err(|e| e.to_string())
    } else {
        fs::remove_file(full_path).map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn test_resolve_safe_path() {
        // We use a dummy root. On Windows this might be tricky if we use /vault, but Path handles it.
        // We just check the logic of joining and validation.
        let root = Path::new("vault_root");

        // Valid paths
        let p1 = resolve_safe_path(root, "note.md");
        assert!(p1.is_ok());
        assert_eq!(p1.unwrap(), root.join("note.md"));

        let p2 = resolve_safe_path(root, "sub/note.md");
        assert!(p2.is_ok());
        assert_eq!(p2.unwrap(), root.join("sub").join("note.md"));

        // Invalid paths
        assert!(resolve_safe_path(root, "/absolute.md").is_err());
        #[cfg(not(windows))]
        assert!(resolve_safe_path(root, "/etc/passwd").is_err());

        assert!(resolve_safe_path(root, "../outside.md").is_err());
        assert!(resolve_safe_path(root, "folder/../escape.md").is_err());
        assert!(resolve_safe_path(root, "..").is_err());
    }
}
