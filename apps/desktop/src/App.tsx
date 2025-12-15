import { useEffect, useState, useCallback } from "react";
import "./App.css";
import { VaultPicker } from "./components/VaultPicker";
import { FileTree } from "./components/FileTree";
import { useTheme, ThemeId } from "./theme";
import { useLinkIndex } from "./components/LinkIndexContext";
import { useSearchIndex } from "./components/SearchIndexContext";
import { SearchModal } from "./components/SearchModal";
import { GraphView } from "./components/GraphView";
import { usePluginHost } from "./plugins/PluginHostProvider";
import { StatusBar } from "./components/StatusBar";
import { PluginsSettings } from "./components/PluginsSettings";
import { HelpModal } from "./components/HelpModal";
import { useVault } from "./hooks/useVault";
import { writeNote, renameItem } from "./ipc";
import { PuzzleIcon, SearchIcon, DocumentTextIcon, ShareIcon, PencilSquareIcon } from "./components/Icons";
import { TabsProvider, useTabs } from "./contexts/TabsContext";
import { EditorPane } from "./components/Editor/EditorPane";

// Main App Component Content (Inside TabsProvider)
function AppContent() {
  const { themeId, setThemeId, availableThemes } = useTheme();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isLoadingIndex } = useLinkIndex(); // Keep for side effects if any, or remove if unused
  const { enabledPlugins } = usePluginHost();

  const {
    vaultConfig,
    files,
    isLoading: isVaultLoading,
    handleResetVault: resetVault,
    handleVaultConfigured,
    refreshFiles
  } = useVault();

  // Use Tabs Context
  const { openTab, switchTab, openTabs, closeTab, activeTabId, dispatch } = useTabs();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPluginsOpen, setIsPluginsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'notes' | 'graph'>('notes');

  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Computed selectedFile for Graph View / interactions
  const activeTab = openTabs.find(t => t.id === activeTabId);
  const selectedFile = activeTab?.path || null;

  // Handle Vault Reset wrapper
  const onResetVault = async () => {
    await resetVault();
    // Clear tabs? Or let them persist until re-open?
    // Probably clear tabs as they are vault-specific.
    // For now, reload logic in TabsProvider handles it via localStorage check on mount,
    // but if we switch vaults without reload, we might see old tabs.
    // Ideally we dispatch a CLEAR_ALL_TABS action.
    // For this MVP, we rely on user manually closing or page refresh.
    // Actually, let's clear local storage key for tabs?
    localStorage.removeItem('liminal-notes.tabs');
    window.location.reload(); // Simplest way to reset everything state-wise
  };

  const handleStartCreate = useCallback(() => {
    // New behavior: Open "Untitled" tab
    // New tabs via "New Note" are always permanent (not preview)
    const newId = crypto.randomUUID();
    openTab({
        id: newId,
        path: '',
        title: 'Untitled',
        mode: 'source',
        isDirty: true,
        isLoading: false,
        isUnsaved: true,
        isPreview: false,
        editorState: ''
    });
  }, [openTab]);

  const handleCreateCommit = useCallback(async (name: string) => {
      // This is for the FileTree input if we still use it.
  }, []);

  const handleCreateCancel = useCallback(() => {
    setIsCreating(false);
    setEditingPath(null);
  }, []);

  const handleRenameCommit = useCallback(async (oldPath: string, newName: string) => {
      if (!newName || !newName.trim()) {
          setEditingPath(null);
          return;
      }

      const parts = oldPath.split('/');
      parts.pop();
      const parent = parts.join('/');
      let newFilename = newName.trim();

      if (oldPath.endsWith('.md') && !newFilename.endsWith('.md')) {
          newFilename += '.md';
      }

      const newPath = parent ? `${parent}/${newFilename}` : newFilename;

      if (newPath === oldPath) {
          setEditingPath(null);
          return;
      }

      try {
          await renameItem(oldPath, newPath);
          await refreshFiles();

          const oldTab = openTabs.find(t => t.id === oldPath); // Assuming ID=path
          if (oldTab) {
              closeTab(oldPath);
              openTab({
                  id: newPath,
                  path: newPath,
                  title: newFilename.replace('.md', ''),
                  mode: 'source',
                  isDirty: oldTab.isDirty,
                  isLoading: false,
                  isUnsaved: false,
                  isPreview: oldTab.isPreview, // Preserve preview state? Or force permanent? Usually permanent on rename.
                  editorState: oldTab.editorState
              });
          }

      } catch (e) {
          alert("Failed to rename: " + String(e));
      } finally {
          setEditingPath(null);
      }
  }, [refreshFiles, openTabs, closeTab, openTab]);

  const handleFileSelect = useCallback((path: string, isDoubleClick: boolean = false) => {
      // Check if already open
      const existing = openTabs.find(t => t.id === path); // Assuming ID=path
      if (existing) {
          if (isDoubleClick && existing.isPreview) {
              dispatch({ type: 'KEEP_TAB', tabId: existing.id });
          }
          switchTab(existing.id);
      } else {
          const title = path.split('/').pop()?.replace('.md', '') || path;
          openTab({
              id: path,
              path,
              title,
              mode: 'source',
              isDirty: false,
              isLoading: false,
              isUnsaved: false,
              isPreview: !isDoubleClick, // Preview if single click
              editorState: ''
          });
      }
  }, [openTabs, switchTab, openTab, dispatch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Search / Quick Open: Ctrl+Shift+F
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }

      // New Note: Ctrl+N
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleStartCreate();
      }

      // Rename: F2
      if (e.key === 'F2' && selectedFile) {
         e.preventDefault();
         setEditingPath(selectedFile);
      }

      // Save (Global)
      if (matchShortcut(e, 'editor.file.save')) {
        e.preventDefault();
        window.dispatchEvent(new Event('liminal:save'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStartCreate, selectedFile]);

  if (isVaultLoading) {
    return <div className="container center">Loading...</div>;
  }

  if (!vaultConfig) {
    return (
      <div className="container center">
        <VaultPicker onVaultConfigured={handleVaultConfigured} />
      </div>
    );
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h3 title={vaultConfig.name}>{vaultConfig.name}</h3>
          <select
            className="theme-selector"
            value={themeId}
            onChange={(e) => setThemeId(e.target.value as ThemeId)}
            title="Select Theme"
          >
            <option value="system">System</option>
            <optgroup label="Light">
              {availableThemes.filter(t => t.category === 'light').map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Dark">
              {availableThemes.filter(t => t.category === 'dark').map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          </select>
          <button className="reset-btn" onClick={handleStartCreate} title="New Note (Ctrl+N)"><PencilSquareIcon size={18} /></button>
          <button className="reset-btn" onClick={() => setIsSearchOpen(true)} title="Search (Ctrl+Shift+F)"><SearchIcon size={18} /></button>
          <button className="reset-btn" onClick={() => setIsPluginsOpen(true)} title="Plugins"><PuzzleIcon size={18} /></button>
          <button className="reset-btn" onClick={() => setIsHelpOpen(true)} title="Help">?</button>
          <button className="reset-btn" onClick={onResetVault} title="Switch Vault">⚙</button>
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'notes' ? 'active' : ''}`}
              onClick={() => setViewMode('notes')}
              title="Notes View"
            >
              <DocumentTextIcon size={18} />
            </button>
            <button
              className={`toggle-btn ${viewMode === 'graph' ? 'active' : ''}`}
              onClick={() => setViewMode('graph')}
              title="Graph View"
            >
              <ShareIcon size={18} />
            </button>
          </div>
        </div>
        <FileTree
            files={files}
            onFileSelect={(path, isDoubleClick) => handleFileSelect(path, isDoubleClick)}
            editingPath={editingPath}
            isCreating={isCreating} // We aren't using this for now via button, but prop required
            onRename={handleRenameCommit}
            onCreate={handleCreateCommit}
            onStartCreate={() => setIsCreating(true)} // Allow context menu creation if implemented?
            onCancel={handleCreateCancel}
        />
      </aside>
      <div className="content-wrapper">
        <main className="main-content">
          {isSearchOpen && (
          <SearchModal
            onClose={() => setIsSearchOpen(false)}
            onSelect={(path) => {
              handleFileSelect(path, false); // Search select is usually single click
              setIsSearchOpen(false);
            }}
          />
        )}
        {isPluginsOpen && <PluginsSettings onClose={() => setIsPluginsOpen(false)} />}
        {isHelpOpen && <HelpModal onClose={() => setIsHelpOpen(false)} />}

        {viewMode === 'graph' ? (
           <GraphView selectedFile={selectedFile} onSelect={(path) => handleFileSelect(path, false)} />
        ) : (
           <EditorPane />
        )}
        </main>
        <StatusBar />
      </div>
    </div>
  );
}

function App() {
    return (
        <TabsProvider>
            <AppContent />
        </TabsProvider>
    );
}

export default App;
