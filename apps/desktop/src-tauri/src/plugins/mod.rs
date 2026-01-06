use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Runtime, State};
use serde::{Deserialize, Serialize};
use serde_json::Value;

mod traits;
pub mod tts;

pub use traits::{NativeBackendPlugin, NativePluginContext, ActivePlugin, Invocable};

pub struct PluginRegistry<R: Runtime> {
    plugins: HashMap<&'static str, Box<dyn NativeBackendPlugin<R>>>,
    active_plugins: Mutex<HashMap<&'static str, ActivePlugin>>,
    _marker: std::marker::PhantomData<R>,
}

// Ensure PluginRegistry is Send + Sync
unsafe impl<R: Runtime> Send for PluginRegistry<R> {}
unsafe impl<R: Runtime> Sync for PluginRegistry<R> {}

impl<R: Runtime> PluginRegistry<R> {
    pub fn new() -> Self {
        Self {
            plugins: HashMap::new(),
            active_plugins: Mutex::new(HashMap::new()),
            _marker: std::marker::PhantomData,
        }
    }

    pub fn register(&mut self, plugin: Box<dyn NativeBackendPlugin<R>>) {
        self.plugins.insert(plugin.id(), plugin);
    }

    pub fn activate(&self, app_handle: AppHandle<R>, plugin_id: &str) -> Result<(), String> {
        let mut active = self.active_plugins.lock().map_err(|e| e.to_string())?;

        if active.contains_key(plugin_id) {
            return Ok(()); // Already active
        }

        if let Some(plugin) = self.plugins.get(plugin_id) {
            let ctx = NativePluginContext {
                app_handle: app_handle.clone(),
                plugin_id: plugin.id(),
            };
            match plugin.activate(ctx) {
                Ok(handle) => {
                    active.insert(plugin.id(), handle);
                    Ok(())
                }
                Err(e) => Err(format!("Failed to activate plugin {}: {}", plugin_id, e)),
            }
        } else {
            Err(format!("Plugin {} not found", plugin_id))
        }
    }

    pub fn deactivate(&self, plugin_id: &str) -> Result<(), String> {
        let mut active = self.active_plugins.lock().map_err(|e| e.to_string())?;

        if let Some(handle) = active.remove(plugin_id) {
            if let Some(plugin) = self.plugins.get(plugin_id) {
                plugin.deactivate(handle)
            } else {
                Err(format!("Plugin {} definition missing during deactivate", plugin_id))
            }
        } else {
            Ok(()) // Not active
        }
    }

    pub async fn invoke(&self, plugin_id: &str, method: &str, payload: Value) -> Result<Value, String> {
        let instance = {
            let active = self.active_plugins.lock().map_err(|e| e.to_string())?;
            if let Some(active_plugin) = active.get(plugin_id) {
                active_plugin.instance.clone()
            } else {
                return Err(format!("Plugin {} not active", plugin_id));
            }
        };

        instance.invoke(method, payload).await
    }
}

#[derive(Serialize)]
pub struct InvokeResult {
    ok: bool,
    request_id: String,
    result: Option<Value>,
    error: Option<InvokeError>,
}

#[derive(Serialize)]
pub struct InvokeError {
    code: String,
    message: String,
    details: Option<Value>,
}

#[tauri::command]
pub async fn native_plugin_invoke<R: Runtime>(
    _app: AppHandle<R>,
    plugin_id: String,
    method: String,
    request_id: String,
    payload: Value,
    registry: State<'_, PluginRegistry<R>>,
) -> Result<InvokeResult, InvokeResult> {
    match registry.invoke(&plugin_id, &method, payload).await {
        Ok(result) => Ok(InvokeResult {
            ok: true,
            request_id,
            result: Some(result),
            error: None,
        }),
        Err(msg) => Err(InvokeResult {
            ok: false,
            request_id,
            result: None,
            error: Some(InvokeError {
                code: "INVOKE_FAILED".into(),
                message: msg,
                details: None,
            }),
        }),
    }
}
