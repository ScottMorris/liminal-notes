import { invoke } from "@tauri-apps/api/core";
import { VaultConfig, FileEntry } from "./types";

export const getVaultConfig = async (): Promise<VaultConfig | null> => {
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
