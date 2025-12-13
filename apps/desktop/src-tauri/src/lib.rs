mod vault;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Cinnamon and similar Linux desktops often lack an accessibility bus, which causes
    // GTK/Wry to spam errors and sometimes abort the launch. Force-disable the AT-SPI
    // bridge when it is not explicitly configured.
    if std::env::var_os("NO_AT_BRIDGE").is_none() {
        std::env::set_var("NO_AT_BRIDGE", "1");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            vault::get_vault_config,
            vault::set_vault_config,
            vault::reset_vault_config,
            vault::list_markdown_files,
            vault::read_note_command,
            vault::write_note_command,
            vault::rename_item
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
