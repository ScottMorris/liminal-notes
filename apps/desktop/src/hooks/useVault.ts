import { useState, useEffect, useCallback } from "react";
import { getVaultConfig, listMarkdownFiles, resetVaultConfig } from "../ipc";
import { VaultConfig, FileEntry } from "../types";
import { useLinkIndex } from "../components/LinkIndexContext";
import { useSearchIndex } from "../components/SearchIndexContext";
import { useNotification } from "../components/NotificationContext";
import { useTags } from "../contexts/TagsContext";

export function useVault() {
  const [vaultConfig, setVaultConfig] = useState<VaultConfig | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { rebuildIndex } = useLinkIndex();
  const { buildIndex: buildSearchIndex } = useSearchIndex();
  const { refreshIndex: refreshTagIndex } = useTags();
  const { notify } = useNotification();

  const refreshFiles = useCallback(async () => {
    try {
      const fileList = await listMarkdownFiles();
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
      const config = await getVaultConfig();
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
      await resetVaultConfig();
      setVaultConfig(null);
      setFiles([]);
    } catch (err) {
      notify("Failed to reset vault: " + String(err), 'error');
    }
  }, [notify]);

  const handleVaultConfigured = useCallback(async (config: VaultConfig) => {
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
