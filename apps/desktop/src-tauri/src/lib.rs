use tauri::Manager;

mod vault;
mod settings;

#[cfg(target_os = "linux")]
fn configure_linux_env() {
    use std::{env, path::Path};

    fn set_env_if_unset(key: &str, value: &str) {
        if env::var_os(key).is_none() {
            env::set_var(key, value);
        }
    }

    // Cinnamon and similar Linux desktops often lack an accessibility bus, which causes
    // GTK/Wry to spam errors and sometimes abort the launch. Force-disable the AT-SPI
    // bridge when it is not explicitly configured.
    set_env_if_unset("NO_AT_BRIDGE", "1");

    let session_type = env::var("XDG_SESSION_TYPE").unwrap_or_default();
    let display = env::var("DISPLAY").ok();
    let wayland_display = env::var("WAYLAND_DISPLAY").ok();
    let inferred_x11 = session_type.eq_ignore_ascii_case("x11")
        || (session_type.is_empty() && display.is_some() && wayland_display.is_none());
    let is_container = ["/run/.containerenv", "/.dockerenv"]
        .into_iter()
        .any(|p| Path::new(p).exists())
        || env::var("DEVCONTAINER").is_ok()
        || env::var("VSCODE_GIT_IPC_HANDLE").is_ok();

    if inferred_x11 && is_container {
        set_env_if_unset("LIBGL_ALWAYS_SOFTWARE", "1");
        set_env_if_unset("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        set_env_if_unset("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        set_env_if_unset("GDK_DISABLE_SHM", "1");
        set_env_if_unset("WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS", "1");
    }

    println!(
        "[liminal-notes bootstrap] session_type={session_type:?} inferred_x11={inferred_x11} in_container={is_container} DISPLAY={display:?} WAYLAND_DISPLAY={wayland_display:?} NO_AT_BRIDGE={:?} WEBKIT_DISABLE_COMPOSITING_MODE={:?} WEBKIT_DISABLE_DMABUF_RENDERER={:?} WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS={:?} GDK_DISABLE_SHM={:?} LIBGL_ALWAYS_SOFTWARE={:?}",
        env::var("NO_AT_BRIDGE").ok(),
        env::var("WEBKIT_DISABLE_COMPOSITING_MODE").ok(),
        env::var("WEBKIT_DISABLE_DMABUF_RENDERER").ok(),
        env::var("WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS").ok(),
        env::var("GDK_DISABLE_SHM").ok(),
        env::var("LIBGL_ALWAYS_SOFTWARE").ok(),
    );
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    configure_linux_env();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            vault::get_vault_config,
            vault::set_vault_config,
            vault::reset_vault_config,
            vault::list_markdown_files,
            vault::read_note_command,
            vault::write_note_command,
            vault::rename_item,
            vault::delete_item,
            settings::get_settings,
            settings::set_setting
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
