import { useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { desktopVaultConfig } from "../adapters/DesktopVaultConfigAdapter";
import type { VaultDescriptor } from "@liminal-notes/vault-core/vault/types";

interface VaultPickerProps {
  onVaultConfigured: (config: VaultDescriptor) => void;
}

export function VaultPicker({ onVaultConfigured }: VaultPickerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isChoosingVault, setIsChoosingVault] = useState(false);
  const isChoosingVaultRef = useRef(false);

  const handleChooseVault = async () => {
    if (isChoosingVaultRef.current) {
      return;
    }

    isChoosingVaultRef.current = true;
    setIsChoosingVault(true);
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

        const descriptor = await desktopVaultConfig.setActiveVaultFromPath(path, name);
        onVaultConfigured(descriptor);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to open dialog or save config. " + String(err));
    } finally {
      isChoosingVaultRef.current = false;
      setIsChoosingVault(false);
    }
  };

  return (
    <div className="vault-picker">
      <h2>Welcome to Liminal Notes</h2>
      <p>Please select a folder to use as your vault.</p>
      <button onClick={handleChooseVault} disabled={isChoosingVault}>
        {isChoosingVault ? "Opening..." : "Choose Vault Folder"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
