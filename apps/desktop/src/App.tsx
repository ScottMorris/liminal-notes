import { useEffect, useState } from "react";
import "./App.css";
import { getVaultConfig, listMarkdownFiles, resetVaultConfig } from "./commands";
import { VaultConfig, FileEntry } from "./types";
import { VaultPicker } from "./components/VaultPicker";
import { FileTree } from "./components/FileTree";
import { useTheme, ThemeId } from "./theme";

function App() {
  const { themeId, setThemeId, availableThemes } = useTheme();
  const [vaultConfig, setVaultConfigState] = useState<VaultConfig | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVault();
  }, []);

  const loadVault = async () => {
    try {
      setLoading(true);
      setError(null);
      const config = await getVaultConfig();
      if (config) {
        setVaultConfigState(config);
        const fileList = await listMarkdownFiles();
        setFiles(fileList);
      } else {
        setVaultConfigState(null);
      }
    } catch (err) {
      console.error("Failed to load vault:", err);
      setError("Unable to load vault: " + String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVaultConfigured = async (config: VaultConfig) => {
    setVaultConfigState(config);
    try {
      const fileList = await listMarkdownFiles();
      setFiles(fileList);
    } catch (err) {
      console.error("Failed to list files:", err);
      setError("Failed to list files: " + String(err));
    }
  };

  const handleResetVault = async () => {
    try {
      await resetVaultConfig();
      setVaultConfigState(null);
      setFiles([]);
      setSelectedFile(null);
      setError(null);
    } catch (err) {
      setError("Failed to reset vault: " + String(err));
    }
  };

  const handleFileSelect = (path: string) => {
    setSelectedFile(path);
  };

  if (loading) {
    return <div className="container center">Loading...</div>;
  }

  if (!vaultConfig) {
    return (
      <div className="container center">
        <VaultPicker onVaultConfigured={handleVaultConfigured} />
        {error && <div className="error-banner">{error} <button onClick={handleResetVault}>Reset</button></div>}
      </div>
    );
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h3>{vaultConfig.name}</h3>
          <select
            className="theme-selector"
            value={themeId}
            onChange={(e) => setThemeId(e.target.value as ThemeId)}
            title="Select Theme"
          >
            <option value="system">System</option>
            {availableThemes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button className="reset-btn" onClick={handleResetVault} title="Switch Vault">⚙</button>
        </div>
        <FileTree files={files} onFileSelect={handleFileSelect} />
      </aside>
      <main className="main-content">
        {error && <div className="error-banner">{error} <button onClick={() => setError(null)}>Dismiss</button></div>}
        {selectedFile ? (
          <div className="preview-placeholder">
            <h2>{selectedFile}</h2>
            <p>(Content rendering coming in Milestone 2)</p>
          </div>
        ) : (
          <div className="empty-state">
            <p>Select a file to view</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
