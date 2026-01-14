import { invoke } from "@tauri-apps/api/core";
import { LegacyVaultConfig, FileEntry } from "./types";

export const getVaultConfig = async (): Promise<LegacyVaultConfig | null> => {
  return await invoke("get_vault_config");
};

export const setVaultConfig = async (rootPath: string, name: string): Promise<void> => {
  return await invoke("set_vault_config", { rootPath, name });
};

export const resetVaultConfig = async (): Promise<void> => {
  return await invoke("reset_vault_config");
};

export const listMarkdownFiles = async (): Promise<FileEntry[]> => {
  return await invoke("list_markdown_files");
};

export const readNote = async (relativePath: string): Promise<string> => {
  return await invoke("read_note_command", { relativePath });
};

export const writeNote = async (relativePath: string, contents: string): Promise<void> => {
  return await invoke("write_note_command", { relativePath, contents });
};

export const renameItem = async (oldPath: string, newPath: string): Promise<void> => {
  return await invoke("rename_item", { oldPath, newPath });
};

export const getSettings = async (): Promise<Record<string, unknown>> => {
  return await invoke("get_settings");
};

export const setSetting = async (key: string, value: unknown): Promise<void> => {
  return await invoke("set_setting", { key, value });
};

export const getLinuxAccentColour = async (): Promise<string> => {
  return await invoke("get_linux_accent_colour");
};
