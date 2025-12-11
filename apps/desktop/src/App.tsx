import { useEffect, useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";
import { getVaultConfig, listMarkdownFiles, resetVaultConfig, readNote, writeNote } from "./commands";
import { VaultConfig, FileEntry } from "./types";
import { VaultPicker } from "./components/VaultPicker";
import { FileTree } from "./components/FileTree";
import { useTheme, ThemeId } from "./theme";
import { useLinkIndex } from "./components/LinkIndexContext";
import { BacklinksPanel } from "./components/BacklinksPanel";
import { useSearchIndex } from "./components/SearchIndexContext";
import { SearchModal } from "./components/SearchModal";

function App() {
  const { themeId, setThemeId, availableThemes } = useTheme();
  const { rebuildIndex, updateNote, resolvePath, isLoadingIndex } = useLinkIndex();
  const { buildIndex: buildSearchIndex, updateEntry: updateSearchEntry, isIndexing: isSearchIndexing } = useSearchIndex();
  const [vaultConfig, setVaultConfigState] = useState<VaultConfig | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Note State
  const [noteContent, setNoteContent] = useState<string>("");
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isLoadingNote, setIsLoadingNote] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    loadVault();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
        // Build initial index
        rebuildIndex(fileList);
        buildSearchIndex(fileList);
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
      rebuildIndex(fileList);
      buildSearchIndex(fileList);
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
      setNoteContent("");
      setIsDirty(false);
    } catch (err) {
      setError("Failed to reset vault: " + String(err));
    }
  };

  const handleFileSelect = async (path: string) => {
    // If previously selected, simple discard unsaved changes (as per Milestone 2 reqs)
    setSelectedFile(path);
    setLoadError(null);
    setIsLoadingNote(true);
    setNoteContent("");
    setIsDirty(false);

    try {
      const content = await readNote(path);
      setNoteContent(content);
    } catch (err) {
      console.error("Failed to read note:", err);
      setLoadError(String(err));
    } finally {
      setIsLoadingNote(false);
    }
  };

  const handleSave = async () => {
    if (!selectedFile) return;

    setIsSaving(true);
    setLoadError(null);
    try {
      await writeNote(selectedFile, noteContent);
      setIsDirty(false);
      updateNote(selectedFile, noteContent);
      updateSearchEntry(selectedFile, noteContent);
    } catch (err) {
      console.error("Failed to save note:", err);
      setLoadError("Failed to save: " + String(err));
    } finally {
      setIsSaving(false);
    }
  };

  // Wikilink support
  const preprocessContent = (content: string) => {
    // Replace [[target]] with [target](wikilink:target)
    // Using a capture group for target.
    return content.replace(/\[\[([^\]]+)\]\]/g, (_match, target) => {
       return `[${target}](wikilink:${target})`;
    });
  };

  const MarkdownComponents = {
    a: ({ href, children, ...props }: any) => {
      if (href && href.startsWith('wikilink:')) {
        const targetRaw = href.replace('wikilink:', '');
        const targetPath = resolvePath(targetRaw);

        if (targetPath) {
          return (
            <a
              href="#"
              className="wikilink resolved"
              onClick={(e) => {
                e.preventDefault();
                handleFileSelect(targetPath);
              }}
              title={`Go to ${targetPath}`}
            >
              {children}
            </a>
          );
        } else {
          return (
            <span className="wikilink unresolved" title="Unresolved link">
              {children}
            </span>
          );
        }
      }
      return <a href={href} {...props}>{children}</a>;
    }
  };

  const processedContent = useMemo(() => preprocessContent(noteContent), [noteContent]);

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
          <button className="reset-btn" onClick={() => setIsSearchOpen(true)} title="Search (Ctrl+P)">🔍</button>
          <button className="reset-btn" onClick={handleResetVault} title="Switch Vault">⚙</button>
        </div>
        <FileTree files={files} onFileSelect={handleFileSelect} />
      </aside>
      <main className="main-content">
        {isSearchOpen && (
          <SearchModal
            onClose={() => setIsSearchOpen(false)}
            onSelect={(path) => {
              handleFileSelect(path);
              setIsSearchOpen(false);
            }}
          />
        )}
        {error && <div className="error-banner">{error} <button onClick={() => setError(null)}>Dismiss</button></div>}

        {selectedFile ? (
          <div className="editor-container">
            <div className="editor-header">
              <div className="file-info">
                <span className="file-name">{selectedFile}</span>
                {isDirty && <span className="unsaved-indicator" title="Unsaved changes"> ●</span>}
                {(isLoadingIndex || isSearchIndexing) && <span className="indexing-indicator" title="Indexing vault..."> (Indexing...)</span>}
              </div>
              <div className="editor-actions">
                {loadError && <span className="editor-error">{loadError}</span>}
                <button onClick={handleSave} disabled={isSaving || isLoadingNote}>
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            <div className="split-pane">
              <div className="editor-pane">
                {isLoadingNote ? (
                  <div className="loading-indicator">Loading...</div>
                ) : (
                  <textarea
                    className="markdown-editor"
                    value={noteContent}
                    onChange={(e) => {
                      setNoteContent(e.target.value);
                      setIsDirty(true);
                    }}
                    disabled={isLoadingNote}
                  />
                )}
              </div>
              <div className="preview-pane">
                <div className="markdown-preview">
                  <ReactMarkdown
                    components={MarkdownComponents}
                    urlTransform={(url) => url}
                  >
                    {processedContent}
                  </ReactMarkdown>
                </div>
              </div>
            </div>

            <BacklinksPanel currentFile={selectedFile} onNavigate={handleFileSelect} />
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
