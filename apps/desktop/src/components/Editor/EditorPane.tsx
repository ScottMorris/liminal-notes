import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { readNote, writeNote } from '../../commands';
import { useTabs } from '../../contexts/TabsContext';
import { usePluginHost } from '../../plugins/PluginHostProvider';
import { useLinkIndex } from '../LinkIndexContext';
import { useSearchIndex } from '../SearchIndexContext';
import { useNotification } from '../NotificationContext';
import { sanitizeFilename } from '../../utils/sanitizeFilename';
import { TabBar } from './TabBar';
import { CodeMirrorEditor, EditorHandle } from './CodeMirrorEditor';
import { SparklesIcon } from '../Icons';
import { AiSidebar } from '../../features/ai/AiSidebar';
import { updateFrontmatter } from '../../utils/frontmatter';

// Confirm Dialog (Simple implementation for now)
const confirmCloseDirty = async (title: string): Promise<'Save' | 'Don\'t Save' | 'Cancel'> => {
  return new Promise((resolve) => {
      // Mock or UI
  });
};

export function EditorPane() {
  const {
    openTabs,
    activeTabId,
    dispatch,
    switchTab,
    updateTabDirty,
    updateTabState,
    updateTabTitle,
    updateTabPath,
    closeTab: closeTabContext
  } = useTabs();

  const activeTab = openTabs.find(t => t.id === activeTabId);
  const { notifyNoteOpened, notifyNoteContentChanged, notifyNoteSaved, enabledPlugins } = usePluginHost();
  const { updateNote, resolvePath } = useLinkIndex();
  const { updateEntry: updateSearchEntry } = useSearchIndex();
  const { notify } = useNotification();

  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(() => {
    return localStorage.getItem('liminal-notes.showPreview') === 'true';
  });
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);

  // Dirty Confirm Modal State
  const [closingTabId, setClosingTabId] = useState<string | null>(null);

  const editorRef = useRef<EditorHandle>(null);

  useEffect(() => {
    localStorage.setItem('liminal-notes.showPreview', String(showPreview));
  }, [showPreview]);

  // Load content when active tab changes
  useEffect(() => {
    if (!activeTab) {
      setContent('');
      return;
    }

    const loadTabContent = async () => {
        // If tab has editorState, restore from it (fastest)
        if (activeTab.editorState) {
            try {
                const state = JSON.parse(activeTab.editorState);
                setContent(state.doc);
                return;
            } catch (e) {
                console.error("Failed to parse editor state", e);
            }
        }

        // If tab has path (and is saved), load from disk
        if (activeTab.path && !activeTab.isUnsaved) {
            setIsLoading(true);
            try {
                const body = await readNote(activeTab.path);
                setContent(body);

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
                setIsLoading(false);
            }
        } else if (activeTab.isUnsaved) {
            // Unsaved (new) note
            if (!activeTab.editorState) {
                setContent('');
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

  const handleContentChange = (newContent: string) => {
    if (newContent !== content) {
        setContent(newContent);

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
    if (!tab) return;
    // Extract title from H1 or use 'Untitled'
    const h1Match = text.match(/^#\s+(.+)$/m);
    const title = h1Match ? h1Match[1].trim() : 'Untitled';

    // Sanitize for filesystem
    let filename = sanitizeFilename(title);
    if (!filename) filename = "Untitled";
    filename += '.md';

    const path = filename;

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
    if (!activeTab) return;
    setIsSaving(true);

    try {
        if (activeTab.isUnsaved) {
            await saveUnsavedTab(activeTab, content);
        } else {
            await writeNote(activeTab.path, content);
            updateTabDirty(activeTab.id, false);
            updateNote(activeTab.path, content);
            updateSearchEntry(activeTab.path, content);
            notifyNoteSaved({
                path: activeTab.path,
                title: activeTab.title,
                content: content
            });
        }
        notify("Note saved", 'success', 2000);
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

  return (
    <div className="editor-container">
       <TabBar
         tabs={openTabs}
         activeTabId={activeTabId}
         onTabSwitch={handleTabSwitch}
         onTabClose={handleCloseTab}
       />

       {activeTab ? (
         <>
           <div className="editor-header">
                <div className="file-info">
                  <span className="file-name">{activeTab.title}</span>
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
                    className={`action-btn ${showPreview ? 'active' : ''}`}
                    onClick={() => setShowPreview(!showPreview)}
                    title={showPreview ? 'Hide preview' : 'Show preview'}
                  >
                    {showPreview ? '👁️ Hide' : '👁️ Preview'}
                  </button>
                  <button onClick={handleSave} disabled={isSaving || isLoading}>
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </div>
           </div>

           <div className="split-pane">
                <div className="editor-pane">
                  {isLoading ? (
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
                    />
                  )}
                </div>
                {showPreview && (
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
         </>
       ) : (
        <div className="empty-state">
            <p>Select a file to view or create a new note (Ctrl+N)</p>
        </div>
       )}

       {enabledPlugins.has('ai-assistant') && isAiSidebarOpen && activeTab && (
          <AiSidebar
            currentNote={{
              path: activeTab.path || '',
              title: activeTab.title,
              content: content
            }}
            onNavigate={(path) => {
                 const existing = openTabs.find(t => t.path === path);
                 if (existing) switchTab(existing.id);
                 else {
                     const title = path.split('/').pop()?.replace('.md', '') || path;
                     dispatch({ type: 'OPEN_TAB', tab: {
                         id: path, path, title, mode: 'source', isDirty: false, isLoading: false, isUnsaved: false, editorState: ''
                     }});
                 }
            }}
            onClose={() => setIsAiSidebarOpen(false)}
            onInsertAtCursor={handleInsertAtCursor}
            onUpdateFrontmatter={handleUpdateFrontmatter}
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
