import { useState, useEffect, useCallback } from "react";
import { desktopVault } from "../adapters/DesktopVaultAdapter";
import { desktopVaultConfig } from "../adapters/DesktopVaultConfigAdapter";
import { FileEntry } from "../types";
import type { VaultDescriptor } from "@liminal-notes/vault-core/vault/types";
import { useLinkIndex } from "../components/LinkIndexContext";
import { useSearchIndex } from "../components/SearchIndexContext";
import { useNotification } from "../components/NotificationContext";
import { useTags } from "../contexts/TagsContext";

export function useVault() {
  const [vaultConfig, setVaultConfig] = useState<VaultDescriptor | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { rebuildIndex } = useLinkIndex();
  const { buildIndex: buildSearchIndex } = useSearchIndex();
  const { refreshIndex: refreshTagIndex } = useTags();
  const { notify } = useNotification();

  const refreshFiles = useCallback(async () => {
    try {
      const adapterFiles = await desktopVault.listFiles();
      // Map VaultFileEntry to FileEntry
      const fileList: FileEntry[] = adapterFiles.map(f => ({
          path: f.id,
          is_dir: f.type === 'directory',
          mtime: f.mtimeMs
      }));

      setFiles(fileList);
      rebuildIndex(fileList);
      buildSearchIndex(fileList);
      refreshTagIndex(fileList);
    } catch (err) {
      notify("Failed to list files: " + String(err), 'error');
    }
  }, [notify, rebuildIndex, buildSearchIndex, refreshTagIndex]);

  const loadVault = useCallback(async () => {
    try {
      setIsLoading(true);
      const config = await desktopVaultConfig.getActiveVault();
      if (config) {
        setVaultConfig(config);
        await refreshFiles();
      } else {
        setVaultConfig(null);
      }
    } catch (err) {
      notify("Failed to load vault: " + String(err), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [notify, refreshFiles]);

  const handleResetVault = useCallback(async () => {
    try {
      await desktopVaultConfig.reset();
      setVaultConfig(null);
      setFiles([]);
    } catch (err) {
      notify("Failed to reset vault: " + String(err), 'error');
    }
  }, [notify]);

  const handleVaultConfigured = useCallback(async (config: VaultDescriptor) => {
    setVaultConfig(config);
    await refreshFiles();
  }, [refreshFiles]);

  useEffect(() => {
    loadVault();
  }, [loadVault]);

  return {
    vaultConfig,
    files,
    isLoading,
    refreshFiles,
    handleResetVault,
    handleVaultConfigured
  };
}
