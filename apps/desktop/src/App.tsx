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
import { HelpModal } from "./components/HelpModal";
import { useVault } from "./hooks/useVault";
import { writeNote, renameItem } from "./ipc";
import { SearchIcon, DocumentTextIcon, ShareIcon, PencilSquareIcon, CogIcon } from "./components/Icons";
import { TabsProvider, useTabs } from "./contexts/TabsContext";
import { EditorPane } from "./components/Editor/EditorPane";
import { commandRegistry } from "./commands/CommandRegistry";
import { SettingsProvider, useSettings } from "./contexts/SettingsContext";
import { SettingsModal } from "./components/Settings/SettingsModal";

function matchShortcut(e: KeyboardEvent, commandId: string): boolean {
  const cmd = commandRegistry.getCommand(commandId);
  if (!cmd || !cmd.shortcut) return false;

  const parts = cmd.shortcut.toLowerCase().split('+');
  const key = parts.pop(); // Last part is the key (e.g., 'f', 'n', 'f2')

  const wantsCtrl = parts.includes('ctrl') || parts.includes('cmd') || parts.includes('mod');
  const wantsShift = parts.includes('shift');
  const wantsAlt = parts.includes('alt');

  // Loose check for Ctrl/Cmd to be cross-platform friendly without OS detection
  const hasCtrl = e.ctrlKey || e.metaKey;

  if (wantsCtrl !== hasCtrl) return false;
  if (wantsShift !== e.shiftKey) return false;
  if (wantsAlt !== e.altKey) return false;

  return e.key.toLowerCase() === key;
}

// Main App Component Content (Inside TabsProvider)
function AppContent() {
  const { setThemeId } = useTheme();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isLoadingIndex } = useLinkIndex(); // Keep for side effects if any, or remove if unused

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
  // Use Settings Context
  const { settings } = useSettings();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'notes' | 'graph'>('notes');

  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Sync settings
  useEffect(() => {
    if (settings['appearance.theme']) {
      setThemeId(settings['appearance.theme'] as ThemeId);
    }
    if (settings['appearance.fontSize']) {
        const size = settings['appearance.fontSize'];
        document.documentElement.style.setProperty('--ln-font-size', `${size}px`);
        document.body.style.fontSize = `${size}px`;
    } else {
        // Default font size
        document.documentElement.style.setProperty('--ln-font-size', '16px');
        document.body.style.fontSize = '16px';
    }
  }, [settings, setThemeId]);

  // Computed selectedFile for Graph View / interactions
  const activeTab = openTabs.find(t => t.id === activeTabId);
  const selectedFile = activeTab?.path || null;

  // Handle Vault Reset wrapper
  const onResetVault = async () => {
    await resetVault();
    localStorage.removeItem('liminal-notes.tabs');
    window.location.reload();
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
      // Search / Quick Open
      if (matchShortcut(e, 'global.search')) {
        e.preventDefault();
        setIsSearchOpen(true);
      }

      // New Note
      if (matchShortcut(e, 'global.newNote')) {
        e.preventDefault();
        handleStartCreate();
      }

      // Rename
      if (matchShortcut(e, 'global.rename') && selectedFile) {
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
          <div style={{ display: 'flex', gap: '5px', flex: 1 }}>
            <button className="reset-btn" onClick={handleStartCreate} title="New Note (Ctrl+N)"><PencilSquareIcon size={18} /></button>
            <button className="reset-btn" onClick={() => setIsSearchOpen(true)} title="Search (Ctrl+Shift+F)"><SearchIcon size={18} /></button>
            <button className="reset-btn" onClick={() => setIsHelpOpen(true)} title="Help">?</button>
          </div>
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
        <div style={{ flex: 1, overflowY: 'auto' }}>
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
        </div>
        <div className="sidebar-footer">
            <button className="reset-btn" onClick={() => setIsSettingsOpen(true)} title="Settings">
                <CogIcon size={20} />
            </button>
        </div>
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
        {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} onResetVault={onResetVault} />}
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
          <SettingsProvider>
            <AppContent />
          </SettingsProvider>
        </TabsProvider>
    );
}

export default App;
