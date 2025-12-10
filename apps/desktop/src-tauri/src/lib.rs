mod vault;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            vault::get_vault_config,
            vault::set_vault_config,
            vault::reset_vault_config,
            vault::list_markdown_files,
            vault::read_note_command,
            vault::write_note_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
