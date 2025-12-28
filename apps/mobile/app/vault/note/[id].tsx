import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, SafeAreaView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { EditorView, EditorViewRef } from '../../../src/components/EditorView';
import { MobileSandboxVaultAdapter } from '../../../src/adapters/MobileSandboxVaultAdapter';
import { EditorCommand, DocChangedPayload, RequestResponsePayload } from '@liminal-notes/core-shared/mobile/editorProtocol';
import { themes } from '@liminal-notes/core-shared/theme';
import { useIndex } from '../../../src/context/IndexContext';
import { parseWikilinks } from '@liminal-notes/core-shared/wikilinks';

enum SaveStatus {
    Idle = 'idle',
    Saving = 'saving',
    Saved = 'saved',
    Error = 'error'
}

const SaveStatusColors = {
    [SaveStatus.Idle]: '#666',
    [SaveStatus.Saving]: '#f57f17', // Orange
    [SaveStatus.Saved]: '#2e7d32', // Green
    [SaveStatus.Error]: '#c62828' // Red
};

export default function NoteScreen() {
  const { id } = useLocalSearchParams();
  const noteId = Array.isArray(id) ? id[0] : id; // Handle potential array from params

  const { searchIndex, linkIndex } = useIndex();
  const editorRef = useRef<EditorViewRef>(null);

  // Autosave refs
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRequestIdRef = useRef<string | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // State
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');

  // Verification State
  const [revision, setRevision] = useState<number>(0);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(SaveStatus.Idle);

  useEffect(() => {
    isMountedRef.current = true;
    loadNote();
    return () => {
      isMountedRef.current = false;
      // Best-effort flush on unmount:
      // If a save was pending (timer running), cancel timer and trigger save immediately.
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        // Attempt to save immediately
        requestSave();
      }
    };
  }, [noteId]);

  const loadNote = async () => {
    if (!noteId) {
        setStatus('error');
        setErrorMsg('No note ID provided');
        return;
    }

    try {
        setStatus('loading');
        const adapter = new MobileSandboxVaultAdapter();
        await adapter.init(); // Ensure root exists

        const result = await adapter.readNote(noteId);
        setContent(result.content);

        // Lazy Indexing: Upsert on open
        if (searchIndex) {
            const indexPromise = searchIndex.upsert({
                id: noteId,
                title: noteId.replace(/\.md$/, ''),
                content: result.content,
                mtimeMs: Date.now()
            });
            if (indexPromise instanceof Promise) {
                indexPromise.catch((e: any) => console.warn('[NoteScreen] Lazy index failed', e));
            }
        }

        if (linkIndex) {
             const links = parseWikilinks(result.content).map(match => ({
                 source: noteId,
                 targetRaw: match.targetRaw,
                 targetPath: match.targetRaw
             }));
             const linkPromise = linkIndex.upsertLinks(noteId, links);
             if (linkPromise instanceof Promise) {
                linkPromise.catch((e: any) => console.warn('[NoteScreen] Lazy link index failed', e));
             }
        }

        setStatus('ready');
    } catch (e: any) {
        setStatus('error');
        setErrorMsg(e.message || 'Failed to load note');
    }
  };

  const handleEditorReady = () => {
    if (!editorRef.current) return;

    // 1. Send Init
    editorRef.current.sendCommand(EditorCommand.Init, {
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        readOnly: false,
        theme: {
            name: themes.light.name,
            vars: themes.light.variables
        },
        featureFlags: {
            links: true
        }
    });

    // 2. Send Content
    editorRef.current.sendCommand(EditorCommand.Set, {
        docId: noteId!,
        text: content,
        // selection could be restored here if we persisted it
    });

    // Reset revision tracking
    setRevision(0);
    setIsDirty(false);
    setSaveStatus(SaveStatus.Idle);
  };

  const requestSave = () => {
    // Note: requestSave might be called during unmount (in cleanup).
    // We check editorRef, but isMounted check is for state updates only.
    if (!editorRef.current || !noteId) return;

    // Clear any existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    if (isMountedRef.current) {
        setSaveStatus(SaveStatus.Saving);
    }

    const requestId = Date.now().toString();
    lastRequestIdRef.current = requestId;

    editorRef.current.sendCommand(EditorCommand.RequestState, {
        requestId,
        include: ['text']
    });
  };

  const handleDocChanged = (payload: DocChangedPayload) => {
      setRevision(payload.revision);
      setIsDirty(true);
      if (saveStatus !== SaveStatus.Error) {
        setSaveStatus(SaveStatus.Idle);
      }

      // Reset debounce timer
      if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
          requestSave();
      }, 1000);
  };

  const handleRequestResponse = async (payload: RequestResponsePayload) => {
      // Validate request ID
      if (payload.requestId !== lastRequestIdRef.current) {
          console.log('[NoteScreen] Ignoring stale response', payload.requestId);
          return;
      }

      if (!payload.state.text) {
          console.warn('[NoteScreen] Received empty text in response');
          return;
      }

      try {
          const adapter = new MobileSandboxVaultAdapter();
          await adapter.writeNote(noteId!, payload.state.text);

          // Incremental Indexing: Upsert on save
          if (searchIndex) {
              const indexPromise = searchIndex.upsert({
                  id: noteId!,
                  title: noteId!.replace(/\.md$/, ''),
                  content: payload.state.text,
                  mtimeMs: Date.now()
              });
              if (indexPromise instanceof Promise) {
                  indexPromise.catch((e: any) => console.warn('[NoteScreen] Index on save failed', e));
              }
          }

          if (linkIndex) {
              const links = parseWikilinks(payload.state.text).map(match => ({
                  source: noteId!,
                  targetRaw: match.targetRaw,
                  targetPath: match.targetRaw
              }));
              const linkPromise = linkIndex.upsertLinks(noteId!, links);
              if (linkPromise instanceof Promise) {
                 linkPromise.catch((e: any) => console.warn('[NoteScreen] Link index on save failed', e));
              }
          }

          if (isMountedRef.current) {
              setSaveStatus(SaveStatus.Saved);

              // Only clear isDirty if NO new save is pending.
              // If saveTimerRef.current is set, it means the user typed while this save was in-flight.
              if (!saveTimerRef.current) {
                setIsDirty(false);
              }
          }
      } catch (e: any) {
          console.error('[NoteScreen] Save failed:', e);
          if (isMountedRef.current) {
              setSaveStatus(SaveStatus.Error);
              // Keep isDirty true
          }
      }
  };

  if (status === 'loading') {
      return (
          <View style={styles.centerContainer}>
              <ActivityIndicator size="large" />
              <Text style={styles.statusText}>Loading note...</Text>
          </View>
      );
  }

  if (status === 'error') {
      return (
          <View style={styles.centerContainer}>
              <Text style={styles.errorText}>Error: {errorMsg}</Text>
              <Text style={styles.detailText}>ID: {noteId}</Text>
          </View>
      );
  }

  const getSaveStatusText = () => {
      switch (saveStatus) {
          case SaveStatus.Saving: return 'Saving...';
          case SaveStatus.Saved: return 'Saved';
          case SaveStatus.Error: return 'Save Failed';
          default: return '';
      }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header / Debug Bar */}
      <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{noteId}</Text>
          <View style={styles.badges}>
              {/* Save Status */}
              {saveStatus !== SaveStatus.Idle && (
                   <Text style={[styles.badge, { color: SaveStatusColors[saveStatus], backgroundColor: 'transparent' }]}>
                       {getSaveStatusText()}
                   </Text>
              )}

              <Text style={styles.badge}>Rev: {revision}</Text>
              {isDirty && <Text style={[styles.badge, styles.dirtyBadge]}>Dirty</Text>}
          </View>
      </View>

      {/* Editor */}
      <EditorView
        ref={editorRef}
        onReady={handleEditorReady}
        onDocChanged={handleDocChanged}
        onRequestResponse={handleRequestResponse}
        onError={(e) => console.error('Editor Error:', e)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  statusText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#888',
  },
  header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
  },
  title: {
      fontSize: 18,
      fontWeight: '600',
      flex: 1,
  },
  badges: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
  },
  badge: {
      fontSize: 12,
      paddingHorizontal: 6,
      paddingVertical: 2,
      backgroundColor: '#f0f0f0',
      borderRadius: 4,
      overflow: 'hidden',
  },
  dirtyBadge: {
      backgroundColor: '#ffebee',
      color: '#c62828',
  }
});
