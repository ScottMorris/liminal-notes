use notify::RecursiveMode;
use notify_debouncer_mini::{new_debouncer, DebounceEventResult};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use walkdir::WalkDir;

// Wrapper struct to hold the watcher
pub struct FileWatcher {
    debouncer: Arc<Mutex<Option<notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>>>>,
    known_paths: Arc<Mutex<HashSet<PathBuf>>>,
}

impl FileWatcher {
    pub fn new() -> Self {
        Self {
            debouncer: Arc::new(Mutex::new(None)),
            known_paths: Arc::new(Mutex::new(HashSet::new())),
        }
    }

    pub fn start(&self, app: AppHandle, path: PathBuf) -> Result<(), String> {
        // Stop existing watcher if any
        self.stop();

        let snapshot = build_known_paths_snapshot(&path);
        {
            let mut known_paths = self.known_paths.lock().unwrap();
            *known_paths = snapshot;
        }

        let app_handle = app.clone();
        let path_clone = path.clone();
        let known_paths = self.known_paths.clone();

        // 500ms debounce time
        let mut debouncer = new_debouncer(
            Duration::from_millis(500),
            move |res: DebounceEventResult| match res {
                Ok(events) => {
                    let mut known = known_paths.lock().unwrap();
                    for event in events {
                        handle_event(&app_handle, event.path, &path_clone, &mut known);
                    }
                }
                Err(e) => eprintln!("Watch error: {:?}", e),
            },
        )
        .map_err(|e| format!("Failed to create watcher: {}", e))?;

        debouncer
            .watcher()
            .watch(&path, RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to watch path: {}", e))?;

        // Store the watcher
        *self.debouncer.lock().unwrap() = Some(debouncer);

        Ok(())
    }

    pub fn stop(&self) {
        // Dropping the debouncer stops it
        *self.debouncer.lock().unwrap() = None;
        self.known_paths.lock().unwrap().clear();
    }
}

fn handle_event(app: &AppHandle, path: PathBuf, root: &Path, known_paths: &mut HashSet<PathBuf>) {
    if should_ignore(root, &path) {
        return;
    }

    if path.exists() {
        let event_name = if known_paths.insert(path.clone()) {
            "vault:file-created"
        } else {
            "vault:file-modified"
        };
        emit_event(app, event_name, root, &path);
    } else {
        known_paths.remove(&path);
        emit_event(app, "vault:file-deleted", root, &path);
    }
}

fn should_ignore(root: &Path, path: &Path) -> bool {
    let Ok(relative) = path.strip_prefix(root) else {
        return true;
    };

    // Ignore .git, .liminal, etc.
    for component in relative.components() {
        if let Some(s) = component.as_os_str().to_str() {
            if s.starts_with('.') && s != "." && s != ".." {
                return true;
            }
        }
    }
    false
}

fn build_known_paths_snapshot(root: &Path) -> HashSet<PathBuf> {
    let mut known_paths = HashSet::new();

    for entry in WalkDir::new(root).into_iter().filter_map(Result::ok) {
        let path = entry.path();
        if path == root || should_ignore(root, path) {
            continue;
        }
        known_paths.insert(path.to_path_buf());
    }

    known_paths
}

fn emit_event(app: &AppHandle, event_name: &str, root: &Path, full_path: &Path) {
    // Convert to relative path
    if let Ok(relative) = full_path.strip_prefix(root) {
        let path_str = relative.to_string_lossy().replace("\\", "/");
        let _ = app.emit(event_name, Payload { path: path_str });
    }
}

#[derive(Clone, serde::Serialize)]
struct Payload {
    path: String,
}

#[cfg(test)]
mod tests {
    use super::{build_known_paths_snapshot, should_ignore};
    use std::fs;
    use std::path::Path;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn ignores_hidden_paths_inside_vault_root() {
        let root = Path::new("/vault");
        let path = Path::new("/vault/.git/config");
        assert!(should_ignore(root, path));
    }

    #[test]
    fn does_not_ignore_paths_when_root_itself_is_hidden() {
        let root = Path::new("/home/user/.vault");
        let path = Path::new("/home/user/.vault/notes/today.md");
        assert!(!should_ignore(root, path));
    }

    #[test]
    fn ignores_paths_outside_vault_root() {
        let root = Path::new("/vault");
        let path = Path::new("/elsewhere/note.md");
        assert!(should_ignore(root, path));
    }

    #[test]
    fn snapshot_excludes_hidden_entries() {
        let temp_root = temp_dir("watcher-snapshot");

        fs::create_dir_all(temp_root.join("notes")).unwrap();
        fs::create_dir_all(temp_root.join(".git")).unwrap();
        fs::write(temp_root.join("notes").join("visible.md"), "# visible").unwrap();
        fs::write(temp_root.join(".git").join("config"), "hidden").unwrap();

        let snapshot = build_known_paths_snapshot(&temp_root);
        assert!(snapshot.contains(&temp_root.join("notes").join("visible.md")));
        assert!(!snapshot.contains(&temp_root.join(".git").join("config")));

        fs::remove_dir_all(temp_root).unwrap();
    }

    fn temp_dir(prefix: &str) -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!("{prefix}-{suffix}"));
        fs::create_dir_all(&path).unwrap();
        path
    }
}
