use notify::{RecursiveMode, Watcher};
use notify_debouncer_mini::{new_debouncer, DebounceEventResult};
use std::path::{Path, PathBuf};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

// Wrapper struct to hold the watcher and control channel
pub struct FileWatcher {
    // We store the debouncer to keep it alive.
    // notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>
    // Using simple Option<Box<dyn Any>> or generic if we want to avoid complex types here,
    // but better to be specific or opaque.
    // Actually, Debouncer has a `watcher()` method but we just need to keep it alive.
    debouncer: Arc<Mutex<Option<notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>>>>,
    stop_tx: Arc<Mutex<Option<Sender<()>>>>,
}

impl FileWatcher {
    pub fn new() -> Self {
        Self {
            debouncer: Arc::new(Mutex::new(None)),
            stop_tx: Arc::new(Mutex::new(None)),
        }
    }

    pub fn start(&self, app: AppHandle, path: PathBuf) -> Result<(), String> {
        // Stop existing watcher if any
        self.stop();

        let (stop_tx, stop_rx) = channel::<()>();

        // Create a channel to receive events from the debouncer
        // notify-debouncer-mini uses a callback or channel.
        // We'll use the callback approach which is simpler to bridge to our thread if needed,
        // OR just handle in callback if it doesn't block.
        // But to be safe and handle 'stop', let's use the callback to send to our own channel?
        // Actually, debouncer runs in its own thread.
        // We can just emit from the callback directly if we clone AppHandle.

        let app_handle = app.clone();
        let path_clone = path.clone();

        // 500ms debounce time
        let mut debouncer = new_debouncer(
            Duration::from_millis(500),
            move |res: DebounceEventResult| {
                match res {
                    Ok(events) => {
                        for event in events {
                            handle_event(&app_handle, event.path, &path_clone);
                        }
                    }
                    Err(e) => eprintln!("Watch error: {:?}", e),
                }
            },
        ).map_err(|e| format!("Failed to create watcher: {}", e))?;

        debouncer
            .watcher()
            .watch(&path, RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to watch path: {}", e))?;

        // Store the watcher
        *self.debouncer.lock().unwrap() = Some(debouncer);
        *self.stop_tx.lock().unwrap() = Some(stop_tx);

        Ok(())
    }

    pub fn stop(&self) {
        if let Some(stop_tx) = self.stop_tx.lock().unwrap().take() {
            let _ = stop_tx.send(());
        }
        // Dropping the debouncer stops it
        *self.debouncer.lock().unwrap() = None;
    }
}

fn handle_event(app: &AppHandle, path: PathBuf, root: &Path) {
    if should_ignore(&path) {
        return;
    }

    // Debouncer gives us just the path and generic "Any" event usually,
    // but notify-debouncer-mini gives DebouncedEvent { path, kind }.
    // Wait, check version 0.4.1 signature.
    // 0.4.1: pub struct DebouncedEvent { pub path: PathBuf, pub kind: DebouncedEventKind }
    // Enums: Any, AnyContinuous.
    // It lumps things together. We mostly care that *something* changed.

    // We can check if file exists to distinguish Create/Modify vs Delete
    if path.exists() {
         // Could be create or modify. We treat them similarly for index updates.
         // But for UI "Conflict", we usually care if it's modified.
         // Let's emit 'changed' for both, or try to infer?
         // Since we don't have previous state easily here, emit 'changed' is safest generic.
         // But wait, the previous code emitted created/deleted/changed.
         // 'deleted' is clear (path !exists).
         emit_event(app, "vault:file-changed", root, &path);
    } else {
         emit_event(app, "vault:file-deleted", root, &path);
    }
}

fn should_ignore(path: &Path) -> bool {
    // Ignore .git, .liminal, etc.
    for component in path.components() {
        if let Some(s) = component.as_os_str().to_str() {
            if s.starts_with('.') && s != "." && s != ".." {
                return true;
            }
        }
    }
    false
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
