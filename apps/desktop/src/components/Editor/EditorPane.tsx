import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { readNote, writeNote, renameItem } from '../../ipc';
import { useTabs } from '../../contexts/TabsContext';
import { useSettings } from '../../contexts/SettingsContext';
import { usePluginHost } from '../../plugins/PluginHostProvider';
import { useLinkIndex } from '../LinkIndexContext';
import { useSearchIndex } from '../SearchIndexContext';
import { useNotification } from '../NotificationContext';
import { useReminders } from '../../contexts/RemindersContext';
import { sanitizeFilename } from '../../utils/sanitizeFilename';
import { TabBar } from './TabBar';
import { CodeMirrorEditor, EditorHandle } from './CodeMirrorEditor';
import { SparklesIcon, EyeIcon, EyeSlashIcon, BellIcon } from '../Icons';
import { AiSidebar } from '../../features/ai/AiSidebar';
import { updateFrontmatter } from '../../utils/frontmatter';
import { ReminderModal } from '../../features/reminders/components/ReminderModal';
import { BacklinksPanel } from '../BacklinksPanel';
import { buildEditorContext } from '../../commands/contextBuilder';
import { commandRegistry } from '../../commands/CommandRegistry';
import { EditorContext } from '../../commands/types';
import { EditorView } from '@codemirror/view';
import { EditableTitle } from './EditableTitle';

export function EditorPane() {
  const {
    openTabs,
    activeTabId,
    dispatch,
    switchTab,
    keepTab,
    updateTabDirty,
    updateTabState,
    updateTabTitle,
    updateTabPath,
    updateTabAiState,
    closeTab: closeTabContext,
    openTab
  } = useTabs();

  const { settings } = useSettings();
  const activeTab = openTabs.find(t => t.id === activeTabId);
  const { notifyNoteOpened, notifyNoteContentChanged, notifyNoteSaved, enabledPlugins } = usePluginHost();
  const { updateNote, resolvePath } = useLinkIndex();
  const { updateEntry: updateSearchEntry } = useSearchIndex();
  const { notify } = useNotification();
  const { reminders } = useReminders();

  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(() => {
    return localStorage.getItem('liminal-notes.showPreview') === 'true';
  });
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);

  // Track which tab the current 'content' belongs to to prevent data bleed
  const [loadedTabId, setLoadedTabId] = useState<string | null>(null);

  // Dirty Confirm Modal State
  const [closingTabId, setClosingTabId] = useState<string | null>(null);

  const editorRef = useRef<EditorHandle>(null);

  const reminderCount = useMemo(() => {
    if (!activeTab || !activeTab.path) return 0;
    return reminders.filter(r =>
        (r.target.type === 'path' && r.target.path === activeTab.path) &&
        (r.status === 'scheduled' || r.status === 'snoozed')
    ).length;
  }, [reminders, activeTab]);

  useEffect(() => {
    localStorage.setItem('liminal-notes.showPreview', String(showPreview));
  }, [showPreview]);

  // Build the editor context for commands
  const getEditorContext = useCallback((view: EditorView): EditorContext => {
    if (!activeTab) throw new Error('No active tab');

    const baseContext = buildEditorContext(
      view,
      activeTab.id,
      activeTab.path
    );

    return {
      ...baseContext,
      isUnsaved: activeTab.isUnsaved,
      operations: {
        saveNote: async (text: string) => {
            if (activeTab.isUnsaved) {
                // Handle unsaved file
                // Use existing path (which should be "Untitled X.md" from creation time now)
                let path = activeTab.path;
                let title = activeTab.title;

                if (!path) {
                    title = 'Untitled';
                    path = 'Untitled.md';
                }

                await writeNote(path, text);

                // Update tab to saved state
                updateTabPath(activeTab.id, path, false);
                updateTabDirty(activeTab.id, false);

                // Update indexes
                updateNote(path, text);
                updateSearchEntry(path, text);
                notifyNoteSaved({ path, title, content: text });

            } else {
                // Normal save
                await writeNote(activeTab.path, text);

                updateTabDirty(activeTab.id, false);

                updateNote(activeTab.path, text);
                updateSearchEntry(activeTab.path, text);
                notifyNoteSaved({
                    path: activeTab.path,
                    title: activeTab.title,
                    content: text
                });
            }
        },
        updateIndexes: (text: string) => {
           if (activeTab.path) {
                updateNote(activeTab.path, text);
                updateSearchEntry(activeTab.path, text);
           }
        },
        notify: (message: string, type: 'success' | 'error') => {
             notify(message, type);
        }
      }
    };
  }, [activeTab, updateTabPath, updateTabTitle, updateTabDirty, updateNote, updateSearchEntry, notifyNoteSaved, notify]);


  // Load content when active tab changes
  useEffect(() => {
    if (!activeTab) {
      setContent('');
      setLoadedTabId(null);
      return;
    }

    // If we are already loaded for this tab ID, and it's not a reload, skip.
    // But we need to be careful. If activeTab changed, we must run.
    if (activeTab.id === loadedTabId) return;

    const loadTabContent = async () => {
        let nextContent = '';
        let needDiskLoad = false;

        // If tab has editorState, restore from it (fastest)
        if (activeTab.editorState) {
            try {
                const state = JSON.parse(activeTab.editorState);
                nextContent = state.doc;
            } catch (e) {
                console.error("Failed to parse editor state", e);
            }
        } else if (activeTab.path && !activeTab.isUnsaved) {
             // If tab has path (and is saved), load from disk
            needDiskLoad = true;
        }

        if (needDiskLoad) {
            setIsLoading(true);
            // Clear content to prevent bleed during async load
            setContent('');

            try {
                const body = await readNote(activeTab.path);
                nextContent = body;

                // Initialize editor state for this tab so we don't re-fetch on switch back
                const initialState = JSON.stringify({
                    doc: body,
                    selection: { anchor: 0, head: 0 }
                });
                updateTabState(activeTab.id, initialState);

                notifyNoteOpened({
                    path: activeTab.path,
                    title: activeTab.title,
                    content: body
                });
            } catch (err) {
                notify("Failed to read note: " + String(err), 'error');
            } finally {
                setContent(nextContent);
                setLoadedTabId(activeTab.id);
                setIsLoading(false);
            }
        } else {
            // Immediate (memory or new unsaved)
            setContent(nextContent);
            setLoadedTabId(activeTab.id);

            // Notify plugins even if loading from memory
            if (activeTab.path || activeTab.isUnsaved) {
                notifyNoteOpened({
                    path: activeTab.path || activeTab.title, // Fallback for new notes
                    title: activeTab.title,
                    content: nextContent
                });
            }
        }
    };

    loadTabContent();
  }, [activeTab?.id]); // Only re-run if ID changes

  const handleEditorBlur = () => {
      if (activeTabId && editorRef.current) {
          const state = editorRef.current.getEditorState();
          updateTabState(activeTabId, state);
      }
  };

  const handleTabSwitch = (newTabId: string) => {
    if (activeTabId && editorRef.current) {
        // Save current state before switching
        const state = editorRef.current.getEditorState();
        updateTabState(activeTabId, state);
    }
    switchTab(newTabId);
  };

  const handleCloseTab = async (tabId: string) => {
    const tab = openTabs.find(t => t.id === tabId);
    if (!tab) return;

    if (tab.isDirty) {
        setClosingTabId(tabId);
    } else {
        closeTabContext(tabId);
    }
  };

  const confirmClose = async (choice: 'Save' | 'Don\'t Save' | 'Cancel') => {
    if (!closingTabId) return;
    const tab = openTabs.find(t => t.id === closingTabId);
    setClosingTabId(null);

    if (choice === 'Cancel') return;

    if (choice === 'Don\'t Save') {
        closeTabContext(closingTabId);
        return;
    }

    if (choice === 'Save' && tab) {
        // We need content to save.
        // If it's the active tab, get from editor
        // If inactive, get from serialized state
        let contentToSave = '';
        if (tab.id === activeTabId && editorRef.current) {
             const stateStr = editorRef.current.getEditorState();
             contentToSave = JSON.parse(stateStr).doc;
        } else if (tab.editorState) {
             contentToSave = JSON.parse(tab.editorState).doc;
        }

        try {
            if (tab.isUnsaved) {
                await saveUnsavedTab(tab, contentToSave);
            } else {
                await writeNote(tab.path, contentToSave);
            }
            closeTabContext(tab.id);
            notify("Note saved and closed", 'success');
        } catch (e) {
            notify("Failed to save: " + String(e), 'error');
        }
    }
  };

  // Listen for global save event
  useEffect(() => {
    const onGlobalSave = () => {
       handleSave();
    };
    window.addEventListener('liminal:save', onGlobalSave);
    return () => window.removeEventListener('liminal:save', onGlobalSave);
  }, [activeTab]);

  const handleContentChange = (newContent: string) => {
    if (newContent !== content) {
        setContent(newContent);

        // If editing a preview tab, make it permanent
        if (activeTab && activeTab.isPreview) {
            keepTab(activeTab.id);
        }

        if (activeTab && !activeTab.isDirty) {
            updateTabDirty(activeTab.id, true);
        }

        if (activeTab) {
            notifyNoteContentChanged({
                path: activeTab.path || activeTab.title,
                title: activeTab.title,
                content: newContent
            });
        }
    }
  };

  const saveUnsavedTab = async (tab: typeof activeTab, text: string) => {
      // Fallback for modal closing logic on unsaved tabs
    if (!tab) return;

    // Default to current title/path if available
    let title = tab.title || 'Untitled';
    let path = tab.path;

    if (!path) {
         path = sanitizeFilename(title) + '.md';
    }

    await writeNote(path, text);

    updateTabPath(tab.id, path, false);
    updateTabTitle(tab.id, title);
    updateTabDirty(tab.id, false);

    // Update indexes
    updateNote(path, text);
    updateSearchEntry(path, text);
    notifyNoteSaved({ path, title, content: text });
  };

  const handleSave = async () => {
    if (!activeTab || !editorRef.current || !editorRef.current.view) return;
    setIsSaving(true);

    try {
        const view = editorRef.current.view;
        const context = getEditorContext(view);
        await commandRegistry.executeCommand('editor.file.save', context, view);
    } catch (err) {
        notify("Failed to save: " + String(err), 'error');
    } finally {
        setIsSaving(false);
    }
  };

  const handleInsertAtCursor = (text: string) => {
      editorRef.current?.insertAtCursor(text);
  };

  const handleUpdateFrontmatter = (updater: (data: any) => void) => {
    const newContent = updateFrontmatter(content, updater);
    setContent(newContent);
    editorRef.current?.insertAtCursor("");
  };

  const handleRename = async (newName: string) => {
      if (!activeTab || !activeTab.path) return;

      const oldPath = activeTab.path;
      // Get directory
      const parts = oldPath.split('/');
      parts.pop();
      const parent = parts.join('/');

      let newFilename = newName;
      if (!newFilename.endsWith('.md')) {
          newFilename += '.md';
      }

      const newPath = parent ? `${parent}/${newFilename}` : newFilename;

      if (newPath === oldPath) return;

      try {
          await renameItem(oldPath, newPath);

          // Re-open tab with new ID
          const newTab = {
              ...activeTab,
              id: newPath,
              path: newPath,
              title: newName,
          };

          // Close old and open new to update ID
          closeTabContext(activeTab.id);
          openTab(newTab);

          notify('Renamed successfully', 'success');
      } catch (e) {
          notify("Failed to rename: " + String(e), 'error');
          throw e; // Propagate to EditableTitle
      }
  };

  const checkFileExists = (name: string) => {
      // Approximate check using resolvePath
      // Note: This checks if *any* file matches the name.
      const resolved = resolvePath(name);
      // It's a collision if it resolves AND it's not the current file
      return !!resolved && resolved !== activeTab?.path;
  };

  // Wikilink support
  const preprocessContent = (text: string) => {
    return text.replace(/\[\[([^\]]+)\]\]/g, (_match, target) => {
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
                const existing = openTabs.find(t => t.path === targetPath);
                if (existing) {
                    switchTab(existing.id);
                } else {
                     const title = targetPath.split('/').pop()?.replace('.md', '') || targetPath;
                     // Wikilinks open in preview mode by default
                     dispatch({
                         type: 'OPEN_TAB',
                         tab: {
                             id: targetPath,
                             path: targetPath,
                             title: title,
                             mode: 'source',
                             isDirty: false,
                             isLoading: false,
                             isUnsaved: false,
                             isPreview: true, // Default to preview for links
                             editorState: ''
                         }
                     });
                }
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

  const handleNavigate = (path: string) => {
      const existing = openTabs.find(t => t.path === path);
      if (existing) {
          switchTab(existing.id);
      } else {
          const title = path.split('/').pop()?.replace('.md', '') || path;
          dispatch({
              type: 'OPEN_TAB',
              tab: {
                  id: path,
                  path: path,
                  title: title,
                  mode: 'source',
                  isDirty: false,
                  isLoading: false,
                  isUnsaved: false,
                  isPreview: true, // Default to preview for navigation
                  editorState: ''
              }
          });
      }
  };

  // Ensure we don't render the editor until the content state matches the active tab
  const isReady = activeTab && activeTab.id === loadedTabId;

  return (
    <div className="editor-container">
       <TabBar
         tabs={openTabs}
         activeTabId={activeTabId}
         onTabSwitch={handleTabSwitch}
         onTabClose={handleCloseTab}
         onKeepTab={keepTab}
       />

       {activeTab ? (
         <>
           <div className="editor-header">
                <div className="file-info">
                  <EditableTitle
                    initialTitle={activeTab.title}
                    parentPath={activeTab.path.split('/').slice(0, -1).join('/')}
                    onRename={handleRename}
                    checkExists={checkFileExists}
                  />
                  {activeTab.isDirty && <span className="unsaved-indicator" title="Unsaved changes"> ●</span>}
                  {activeTab.isUnsaved && <span className="indexing-indicator"> (Unsaved)</span>}
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
                  <button
                    className={`action-btn ${isReminderModalOpen ? 'active' : ''}`}
                    onClick={() => setIsReminderModalOpen(true)}
                    title="Set Reminder"
                  >
                    <div style={{ position: 'relative', display: 'flex' }}>
                        <BellIcon size={16} />
                        {reminderCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '-4px',
                                right: '-4px',
                                backgroundColor: 'var(--ln-accent)',
                                color: 'white',
                                borderRadius: '50%',
                                fontSize: '0.6em',
                                minWidth: '12px',
                                height: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '1px'
                            }}>
                                {reminderCount}
                            </span>
                        )}
                    </div>
                  </button>
                  <button
                    className={`action-btn ${showPreview ? 'active' : ''}`}
                    onClick={() => setShowPreview(!showPreview)}
                    title={showPreview ? 'Hide preview' : 'Show preview'}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {showPreview ? (
                        <>
                          <EyeSlashIcon size={16} /> Hide
                        </>
                      ) : (
                        <>
                          <EyeIcon size={16} /> Preview
                        </>
                      )}
                    </span>
                  </button>
                  <button onClick={handleSave} disabled={isSaving || isLoading}>
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </div>
           </div>

           <div className="editor-workspace" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
               <div className="document-column" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                   <div className="split-pane">
                        <div className="editor-pane">
                        {isLoading || !isReady ? (
                            <div className="loading-indicator">Loading...</div>
                        ) : (
                            <CodeMirrorEditor
                            key={activeTab.id}
                            ref={editorRef}
                            value={content}
                            initialState={activeTab.editorState}
                            onChange={handleContentChange}
                            onSave={handleSave}
                            onBlur={handleEditorBlur}
                            noteId={activeTab.id}
                            path={activeTab.path}
                            getEditorContext={getEditorContext}
                            onLinkClick={handleNavigate}
                            showLineNumbers={settings['editor.showLineNumbers'] !== false}
                            readableLineLength={settings['editor.readableLineLength'] === true}
                            wordWrap={settings['editor.wordWrap'] === true}
                            />
                        )}
                        </div>
                        {showPreview && isReady && (
                        <div className="preview-pane">
                            <div className="markdown-preview">
                            <ReactMarkdown
                                components={MarkdownComponents}
                                urlTransform={(url) => url}
                            >
                                {preprocessContent(content)}
                            </ReactMarkdown>
                            </div>
                        </div>
                        )}
                    </div>
                    <BacklinksPanel
                        currentFile={activeTab.path || null}
                        onNavigate={handleNavigate}
                    />
                </div>

                {enabledPlugins.has('ai-assistant') && isAiSidebarOpen && activeTab && (
                    <AiSidebar
                        currentNote={{
                        path: activeTab.path || '',
                        title: activeTab.title,
                        content: content
                        }}
                        aiState={activeTab.aiState}
                        onUpdateAiState={(newState) => updateTabAiState(activeTab.id, newState)}
                        onNavigate={handleNavigate}
                        onClose={() => setIsAiSidebarOpen(false)}
                        onInsertAtCursor={handleInsertAtCursor}
                        onUpdateFrontmatter={handleUpdateFrontmatter}
                    />
                )}
           </div>
         </>
       ) : (
        <div className="empty-state">
            <p>Select a file to view or create a new note (Ctrl+N)</p>
        </div>
       )}

       {isReminderModalOpen && activeTab && (
            <ReminderModal
                onClose={() => setIsReminderModalOpen(false)}
                defaultTarget={{
                    title: activeTab.title,
                    path: activeTab.path
                }}
            />
       )}

       {/* Dirty Confirmation Modal */}
       {closingTabId && (
           <div className="modal-overlay">
               <div className="modal-content" style={{ minWidth: '300px' }}>
                   <div className="modal-header">
                       <h3>Unsaved Changes</h3>
                   </div>
                   <div className="modal-body">
                       <p>Do you want to save changes to "{openTabs.find(t => t.id === closingTabId)?.title}"?</p>
                       <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                           <button onClick={() => confirmClose('Don\'t Save')}>Don't Save</button>
                           <button onClick={() => confirmClose('Cancel')}>Cancel</button>
                           <button onClick={() => confirmClose('Save')} style={{ backgroundColor: 'var(--ln-accent)', color: 'white' }}>Save</button>
                       </div>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
}
