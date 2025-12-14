import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { setVaultConfig } from "../ipc";
import { VaultConfig } from "../types";

interface VaultPickerProps {
  onVaultConfigured: (config: VaultConfig) => void;
}

export function VaultPicker({ onVaultConfigured }: VaultPickerProps) {
  const [error, setError] = useState<string | null>(null);

  const handleChooseVault = async () => {
    try {
      setError(null);
      const selected = await open({
        directory: true,
        multiple: false,
        recursive: false,
      });

      if (selected) {
        // selected is string (path) or string[] (if multiple)
        // With multiple: false, it is string | null
        const path = selected as string; // Assert string

        // Derive name from path (last folder name)
        // Need to handle both / and \
        const normalizedPath = path.replace(/\\/g, "/");
        const name = normalizedPath.split("/").pop() || "Vault";

        await setVaultConfig(path, name);
        onVaultConfigured({ root_path: path, name });
      }
    } catch (err) {
      console.error(err);
      setError("Failed to open dialog or save config. " + String(err));
    }
  };

  return (
    <div className="vault-picker">
      <h2>Welcome to Liminal Notes</h2>
      <p>Please select a folder to use as your vault.</p>
      <button onClick={handleChooseVault}>Choose Vault Folder</button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
