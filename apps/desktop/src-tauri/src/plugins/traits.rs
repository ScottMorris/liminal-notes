use tauri::{AppHandle, Runtime};
use serde_json::Value;
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

pub trait Invocable: Send + Sync {
    fn invoke(&self, method: &str, payload: Value) -> Pin<Box<dyn Future<Output = Result<Value, String>> + Send>>;
}

pub trait NativeBackendPlugin<R: Runtime>: Send + Sync {
    fn id(&self) -> &'static str;
    fn activate(&self, ctx: NativePluginContext<R>) -> Result<ActivePlugin, String>;
    #[allow(dead_code)]
    fn deactivate(&self, handle: ActivePlugin) -> Result<(), String>;
}

pub struct ActivePlugin {
    pub instance: Arc<dyn Invocable>,
}

pub struct NativePluginContext<R: Runtime> {
    pub app_handle: AppHandle<R>,
    pub plugin_id: &'static str,
}

impl<R: Runtime> Clone for NativePluginContext<R> {
    fn clone(&self) -> Self {
        Self {
            app_handle: self.app_handle.clone(),
            plugin_id: self.plugin_id,
        }
    }
}
