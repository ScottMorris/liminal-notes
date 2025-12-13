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
import { writeNote, renameItem } from "./commands";
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
    const newId = crypto.randomUUID();
    openTab({
        id: newId,
        path: '',
        title: 'Untitled',
        mode: 'source',
        isDirty: true,
        isLoading: false,
        isUnsaved: true,
        editorState: ''
    });
    // We don't use the sidebar input for creating "New Note" via button anymore?
    // The requirement said "Create new tab".
    // BUT the sidebar "New Note" button previously triggered inline creation in file tree.
    // Requirement 3.1: "When opening a note from file tree... New tabs should load content".
    // Requirement 4: "New Note behavior - Untitled Ephemeral Tabs".

    // So Ctrl+N / Button should open Untitled Tab.
    // Sidebar File Tree "New File" (if it existed) might be different.
    // The existing "New Note" button used `handleStartCreate` to show input in tree.
    // We replace this with opening an Untitled Tab.

    // What about `FileTree` creation? The `FileTree` component has `onStartCreate` prop.
    // If we want to keep the tree-based creation as an alternative, we can.
    // But "New Note" (Ctrl+N) usually means "Open empty editor".

    // Let's stick to the plan: Ctrl+N -> Untitled Tab.
    // File Tree context menu or button might still do file-on-disk creation.
    // The current `FileTree` props: `isCreating`, `onRename`, `onCreate`.
    // I will leave `FileTree` logic mostly as is for explicit "Create File in Folder" actions if supported,
    // but the main "New Note" action will use tabs.

    // Actually, `FileTree` `isCreating` shows an input box at root.
    // Let's DISABLE that for the main button and use Tabs.
    // But `FileTree` might still need it?
    // Let's decouple the button from `FileTree`.
  }, [openTab]);

  const handleCreateCommit = useCallback(async (name: string) => {
      // This is for the FileTree input if we still use it.
      // If we don't use it, we can remove this or keep it for compatibility if FileTree internally uses it.
      // Current FileTree seems to be controlled by parent props.
      // If we don't set `isCreating=true`, this won't be called.
      // So we can ignore it if we don't trigger it.
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

          // If we renamed a file that is open in a tab, we should update the tab
          // Find tab with id == oldPath (since for existing files id=path)
          // Wait, if id=path, we need to update ID too?
          // If we change ID, React keys change, editor remounts.
          // Ideally ID should be UUID.
          // But for now ID=path for existing files.
          // So we need to close old tab and open new one? Or update Tab in place?
          // If we update ID, we need a robust reducer action.
          // For now, let's just update title and path?
          // But ID is used for lookup.
          // Let's check if we have a tab open with this path.

          // This is a bit tricky with ID=path.
          // Ideally we migrate to UUIDs for all tabs, but for file-based tabs, path is convenient unique key.
          // Let's try to update:
          // We need a NEW action: `RENAME_TAB_ID`?
          // Or just close and reopen?
          // Close and reopen loses undo history (which we lose anyway on switch).
          // Let's close old and open new.

          // But first, let's just handle the file system rename.
          // The tab will point to a non-existent file?
          // If we don't update tab, user sees error on save.

          // Workaround: Loop through tabs, if any matches oldPath, close it and open newPath?
          const oldTab = openTabs.find(t => t.id === oldPath); // Assuming ID=path
          if (oldTab) {
              closeTab(oldPath);
              openTab({
                  id: newPath,
                  path: newPath,
                  title: newFilename.replace('.md', ''),
                  mode: 'source',
                  isDirty: oldTab.isDirty, // Preserve dirty? No, file moved.
                  isLoading: false,
                  isUnsaved: false,
                  editorState: oldTab.editorState
              });
          }

      } catch (e) {
          alert("Failed to rename: " + String(e));
      } finally {
          setEditingPath(null);
      }
  }, [refreshFiles, openTabs, closeTab, openTab]);

  const handleFileSelect = useCallback((path: string) => {
      // Check if already open
      const existing = openTabs.find(t => t.id === path); // Assuming ID=path
      if (existing) {
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
              editorState: ''
          });
      }
  }, [openTabs, switchTab, openTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Search / Quick Open: Ctrl+Shift+F
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }

      // Save: Ctrl+S -> Handled by CodeMirror if focused, or EditorPane global handler?
      // EditorPane has a local `handleSave`.
      // App doesn't know about EditorPane's internal save logic easily without ref/context.
      // But `EditorPane` mounts the editor.
      // If focus is NOT in editor (e.g. sidebar), Ctrl+S should probably still save active tab.
      // We can expose `saveActiveTab` in Context? No, context is state.
      // We can use an event bus or just rely on Editor being focused?
      // "Save command is handled by the CodeMirror keymap when the editor is focused".
      // Falling back to global handler:
      // If we are in App, we don't have direct access to `writeNote` with `content`.
      // `EditorPane` owns `content`.
      // So we should move the global shortcut listener INTO `EditorPane` or expose a save trigger.
      // For now, let's assume user focuses editor to save, or we move this listener to `EditorPane`.
      // The original App.tsx had it.
      // Let's remove it from here and rely on EditorPane (which I will add listener to).

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
            onFileSelect={handleFileSelect}
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
              handleFileSelect(path);
              setIsSearchOpen(false);
            }}
          />
        )}
        {isPluginsOpen && <PluginsSettings onClose={() => setIsPluginsOpen(false)} />}
        {isHelpOpen && <HelpModal onClose={() => setIsHelpOpen(false)} />}

        {viewMode === 'graph' ? (
           <GraphView selectedFile={selectedFile} onSelect={handleFileSelect} />
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
