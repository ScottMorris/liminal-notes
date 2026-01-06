# NATIVE_BACKEND_PLUGIN_SYSTEM.md – Native Rust Backend Plugins (Core)

## 1. Purpose

This document specifies a **native (Rust) backend plugin system** for Liminal Notes desktop.

The intent is to allow **first-party core plugins** to ship **native Rust backend functionality** that can be:

* discovered via plugin manifests
* enabled/disabled by the user
* started/stopped with a clear lifecycle
* accessed from the WebView frontend through a small, well-defined RPC/event surface

This is a **core-only** capability in v0.1. **Enforcement:** `entrypoints.backendNative` is only honoured for **bundled core plugin manifests** (e.g., shipped with the app under a core resources directory). Manifests loaded from **user plugin directories** must be treated as untrusted and **cannot activate** native backends; if a user-installed plugin declares `backendNative`, the host must mark it **unavailable** with a clear reason (unless the plugin ID is explicitly allowlisted by the app build). Third-party native plugins are explicitly out of scope.

---

## 2. Goals

1. **Plugin-shaped native features**

* Features implemented in Rust can still behave like plugins (toggleable, lifecycle-managed).

2. **Stable interface between WebView and native plugin**

* Simple request/response calls (“invoke”) plus namespaced events.

3. **No dynamic Tauri command registration required**

* The system must work within Tauri’s typical “compile-time command registration” constraints.

4. **Safe defaults**

* Native plugins are compiled into the app and registered in a static registry.
* Plugin manifests can reference only those registered native plugins.

---

## 3. Non-goals (v0.1)

* Loading arbitrary third-party Rust binaries/dylibs.
* A general sandbox/security model for untrusted native code.
* Hot-reloading native plugins.

---

## 4. Terminology

* **Frontend plugin**: JS/TS UI code running in the WebView.
* **Backend plugin (sandboxed JS)**: JS runtime backend plugin (existing system).
* **Native backend plugin**: Rust implementation compiled into the desktop app, managed as a plugin.
* **Plugin manifest**: `manifest.json` describing metadata and entrypoints.

---

## 5. Manifest format

### 5.1 Entry points

Extend `manifest.json` `entrypoints` with an optional key:

* `backendNative`: a string identifier (native key) used for **registry lookup**. The host must resolve `entrypoints.backendNative` by matching it to `NativeBackendPlugin::id()` (**recommended:** these must be equal). This native key is distinct from the plugin’s manifest `id` (e.g., `core.tts`), which is used for **user-facing identification** and **event namespacing** (e.g., `plugin:<manifestId>/<eventName>`).

Example:

```json
{
  "id": "core.tts",
  "name": "Read Aloud (TTS)",
  "version": "0.1.0",
  "entrypoints": {
    "backendNative": "tts",
    "frontend": "ui.js"
  }
}
```

### 5.2 Validation

At load time:

* If `entrypoints.backendNative` is present, it must match an ID in the native plugin registry.
* If it does not match, the plugin is marked “unavailable” with a readable error.

---

## 6. Lifecycle

### 6.1 Host responsibilities

The desktop backend hosts native plugins and controls lifecycle:

* **Activate** when:

  * user enables the plugin, or
  * app starts and the plugin was enabled

* **Deactivate** when:

  * user disables the plugin, or
  * app shuts down

The host also:

* routes invoke calls from the frontend to active plugins
* provides an event emitter for plugin → frontend notifications

### 6.2 Plugin trait

Define a trait (names illustrative):

* `id() -> &'static str`
* `activate(ctx: NativePluginContext) -> Result<ActivePlugin>`
* `deactivate(handle: ActiveHandle) -> Result<()>`

`ActivePlugin` is a handle that includes:

* plugin state (struct)
* cancellation handles for running jobs
* any resources that must be cleaned up on deactivate

### 6.3 Idempotence

* Activating an already-active plugin is a no-op.
* Deactivating an inactive plugin is a no-op.

---

## 7. Native plugin registry

### 7.1 Registration

Native plugins are registered in a static registry at build time, e.g.:

* `register_native_plugins() -> HashMap<String, Box<dyn NativeBackendPlugin>>`

### 7.2 Core-only policy

Only plugins compiled into the desktop binary may be registered.

---

## 8. Frontend ↔ Native plugin API

### 8.1 Command routing (recommended: command router)

Because Tauri typically registers commands at compile time, the host should expose a **single command router**:

* `native_plugin_invoke({ pluginId, method, requestId, payload }) -> Promise<{ ok: boolean, requestId: string, result?: any, error?: { code: string, message: string, details?: any } }>`

Where:

* `pluginId` is the plugin’s manifest ID (e.g., `core.tts`)
* `method` is a string defined by the plugin (e.g., `start`, `cancel`, `listVoices`)
* `requestId` is a caller-generated unique ID used to correlate responses when multiple invokes are in-flight
* `payload` is JSON (**keep it small**; for large data, pass file paths/handles instead of embedding blobs)

This avoids dynamic per-plugin command registration.

### 8.2 Request/response contract

* Inputs and outputs are JSON-serializable, and `native_plugin_invoke` is intended to be async/await-friendly.
* Errors return a structured error:

```ts
{ code: string, message: string, details?: any }
```

### 8.3 Events

Native plugins emit events to the frontend via the host event bus.

Events are namespaced:

* `plugin:<pluginId>/<eventName>`

Example:

* `plugin:core.tts/job_progress`
* `plugin:core.tts/job_done`

Event payloads are JSON.

### 8.4 Long-running jobs

Native plugins should model long-running work as jobs:

* `start(...) -> { jobId }`
* progress emitted as events
* `cancel({ jobId })`

The host should not block Tauri command threads on long-running work.

---

## 9. Host context exposed to plugins

`NativePluginContext` provides controlled access to core services. At minimum:

* Settings KV read/write (plugin-scoped namespace)
* App data directory paths
* Vault/note read API (if permitted by the core plugin design)
* Event emitter (namespaced)
* Background task executor or handle (Tokio runtime handle)

# LOCAL_TTS_PLUGIN.mdOptional (future):

* Logging helpers (plugin-scoped)
* Structured telemetry

---

## 10. Enable/disable persistence

* Enabled state is persisted in settings:

  * `corePlugins.enabled = ["core.tts", ...]`

On startup:

* host loads manifests
* host activates all enabled native plugins

---

## 11. Interactions with existing plugin system

* A plugin may have:

  * frontend only
  * sandboxed backend only
  * native backend only
  * both frontend + native backend

If both sandboxed backend and native backend are specified, behaviour must be explicit:

* v0.1 rule: **disallow** both in one plugin unless there is a strong use case. The host must validate manifests and **mark the plugin unavailable (with a clear reason)** if both sandboxed backend and native backend entrypoints are present.

---

## 12. Error handling

* If activation fails, the plugin is marked unavailable and the error is surfaced in Settings.
* If a plugin errors during `invoke`, return a structured error and keep the host stable.
* Deactivate must attempt best-effort cleanup even if some resources are already gone.

---

## 13. Testing

### 13.1 Unit tests

* registry mapping is stable (IDs unique)
* enable/disable transitions are correct and idempotent
* invoke routing errors when plugin is disabled

### 13.2 Integration tests

* start app with an enabled native plugin; verify activation
* invoke method from frontend; verify response
* disable plugin; verify deactivation and invoke refusal

---

## 14. Future work

* Permission enforcement for core plugins beyond “core-only trust” (capability-based access via context).
* Optional: allow third-party native plugins through a signed bundle + strict sandboxing (not planned for v0.1).
