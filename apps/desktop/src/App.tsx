import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";
import { VaultPicker } from "./components/VaultPicker";
import { FileTree } from "./components/FileTree";
import { useTheme, ThemeId } from "./theme";
import { useLinkIndex } from "./components/LinkIndexContext";
import { BacklinksPanel } from "./components/BacklinksPanel";
import { useSearchIndex } from "./components/SearchIndexContext";
import { SearchModal } from "./components/SearchModal";
import { GraphView } from "./components/GraphView";
import { usePluginHost } from "./plugins/PluginHostProvider";
import { StatusBar } from "./components/StatusBar";
import { PluginsSettings } from "./components/PluginsSettings";
import { AiSidebar } from "./features/ai/AiSidebar";
import { HelpModal } from "./components/HelpModal";
import { useVault } from "./hooks/useVault";
import { useNote } from "./hooks/useNote";
import { updateFrontmatter } from "./utils/frontmatter";
import { writeNote, renameItem } from "./commands";
import { PuzzleIcon, SearchIcon, DocumentTextIcon, ShareIcon, SparklesIcon, PencilSquareIcon } from "./components/Icons";
import { CodeMirrorEditor, EditorHandle } from "./components/Editor/CodeMirrorEditor";

function App() {
  const { themeId, setThemeId, availableThemes } = useTheme();
  const { resolvePath, isLoadingIndex } = useLinkIndex();
  const { isIndexing: isSearchIndexing } = useSearchIndex();
  const { enabledPlugins } = usePluginHost();

  const {
    vaultConfig,
    files,
    isLoading: isVaultLoading,
    handleResetVault: resetVault,
    handleVaultConfigured,
    refreshFiles
  } = useVault();

  const {
    selectedFile,
    noteContent,
    isDirty,
    isLoadingNote,
    isSaving,
    handleFileSelect,
    handleSave,
    updateContent,
    clearSelection
  } = useNote();

  const editorRef = useRef<EditorHandle>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPluginsOpen, setIsPluginsOpen] = useState(false);
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'notes' | 'graph'>('notes');

  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Handle Vault Reset wrapper to also clear note selection
  const onResetVault = async () => {
    await resetVault();
    clearSelection();
  };

  const handleInsertAtCursor = (text: string) => {
    if (editorRef.current) {
      editorRef.current.insertAtCursor(text);
    } else {
      // Fallback if ref is not available (e.g. view mode not ready), append to end
      updateContent(noteContent + "\n" + text);
    }
  };

  const handleUpdateFrontmatter = (updater: (data: any) => void) => {
    const newContent = updateFrontmatter(noteContent, updater);
    updateContent(newContent);
  };

  const handleStartCreate = useCallback(() => {
    setIsCreating(true);
    setEditingPath(null);
  }, []);

  const handleCreateCancel = useCallback(() => {
    setIsCreating(false);
    setEditingPath(null);
  }, []);

  const handleCreateCommit = useCallback(async (name: string) => {
    if (!name) {
        handleCreateCancel();
        return;
    }
    let filename = name.trim();
    if (!filename.endsWith('.md')) filename += '.md';

    // Check for duplicates
    if (files.some(f => f.path === filename)) {
        alert(`A file named "${filename}" already exists.`);
        return;
    }

    try {
        await writeNote(filename, "");
        await refreshFiles();
        handleFileSelect(filename);
        setIsCreating(false);
    } catch (e) {
        alert("Failed to create note: " + String(e));
        setIsCreating(false);
    }
  }, [files, handleCreateCancel, refreshFiles, handleFileSelect]);

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
          if (selectedFile === oldPath) {
              handleFileSelect(newPath);
          }
      } catch (e) {
          alert("Failed to rename: " + String(e));
      } finally {
          setEditingPath(null);
      }
  }, [refreshFiles, selectedFile, handleFileSelect]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Search / Quick Open: Ctrl+Shift+F
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }

      // Save: Ctrl+S
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        // If editor is focused, CodeMirror will handle it
        if (document.activeElement?.closest('.cm-editor')) {
          return; // Let CodeMirror handle it
        }

        e.preventDefault();
        handleSave();
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
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, selectedFile]);

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
            isCreating={isCreating}
            onRename={handleRenameCommit}
            onCreate={handleCreateCommit}
            onStartCreate={handleStartCreate}
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
          selectedFile ? (
            <div className="editor-container">
              <div className="editor-header">
                <div className="file-info">
                  <span className="file-name">{selectedFile}</span>
                  {isDirty && <span className="unsaved-indicator" title="Unsaved changes"> ●</span>}
                  {(isLoadingIndex || isSearchIndexing) && <span className="indexing-indicator" title="Indexing vault..."> (Indexing...)</span>}
                </div>
                <div className="editor-actions">
                  {enabledPlugins.has('ai-assistant') && (
                      <button
                        className={`action-btn ${isAiSidebarOpen ? 'active' : ''}`}
                        onClick={() => setIsAiSidebarOpen(!isAiSidebarOpen)}
                        title="Toggle AI Assistant"
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <SparklesIcon size={16} /> AI
                        </span>
                      </button>
                  )}
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
                    <CodeMirrorEditor
                      ref={editorRef}
                      value={noteContent}
                      onChange={updateContent}
                      onSave={handleSave}
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
          )
        )}
        </main>
        <StatusBar />
      </div>
      {enabledPlugins.has('ai-assistant') && isAiSidebarOpen && (
          <AiSidebar
            currentNote={selectedFile ? {
              path: selectedFile,
              title: selectedFile.split('/').pop()?.replace('.md', '') || selectedFile,
              content: noteContent
            } : null}
            onNavigate={handleFileSelect}
            onClose={() => setIsAiSidebarOpen(false)}
            onInsertAtCursor={handleInsertAtCursor}
            onUpdateFrontmatter={handleUpdateFrontmatter}
          />
      )}
    </div>
  );
}

export default App;
