import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, BackHandler, Platform, Alert, KeyboardAvoidingView, Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useNavigation } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme as usePaperTheme, ActivityIndicator, Text } from 'react-native-paper';
import { EditorView, EditorViewRef } from '../../../src/components/EditorView';
import { EditorCommand, DocChangedPayload, RequestResponsePayload } from '@liminal-notes/core-shared/mobile/editorProtocol';
import { MobileSandboxVaultAdapter } from '../../../src/adapters/MobileSandboxVaultAdapter';
import { recentsStorage } from '../../../src/storage/recents';
import { useIndex } from '../../../src/context/IndexContext';
import { parseWikilinks } from '@liminal-notes/core-shared/indexing/resolution';
import { themes } from '@liminal-notes/core-shared/theme';
import { useSettings } from '../../../src/context/SettingsContext';
import { useTheme } from '../../../src/context/ThemeContext'; // Import custom ThemeContext
import { FormattingToolbar } from '../../../src/components/Editor/FormattingToolbar';
import { EditableHeaderTitle } from '../../../src/components/Editor/EditableHeaderTitle';
import { renameNote } from '../../../src/utils/fileOperations';

const DEBUG = false;

enum SaveStatus {
    Idle = 'idle',
    Saving = 'saving',
    Saved = 'saved',
    Error = 'error'
}

const SaveStatusColours = {
    [SaveStatus.Idle]: '#888',
    [SaveStatus.Saving]: '#e6a23c', // Warning/Orange
    [SaveStatus.Saved]: '#67c23a', // Success/Green
    [SaveStatus.Error]: '#f56c6c', // Danger/Red
};

// Simplified Footer without date-fns for now
function LastSavedFooter({ timestamp }: { timestamp: number | null }) {
    const theme = usePaperTheme();
    if (!timestamp) return <View style={[styles.footer, { backgroundColor: theme.colors.elevation.level1, borderTopColor: theme.colors.outlineVariant }]}><Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>Unsaved</Text></View>;

    const date = new Date(timestamp);
    return (
        <View style={[styles.footer, { backgroundColor: theme.colors.elevation.level1, borderTopColor: theme.colors.outlineVariant }]}>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>Last saved: {date.toLocaleTimeString()}</Text>
        </View>
    );
}

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Decode ID in case it contains encoded characters
  const noteId = id ? decodeURIComponent(id) : null;

  const router = useRouter();
  const navigation = useNavigation();
  const { searchIndex, linkIndex } = useIndex();
  const { settings } = useSettings();
  const paperTheme = usePaperTheme();
  const { theme } = useTheme(); // Use custom theme context to get active theme vars
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');

  const [saveStatus, setSaveStatus] = useState<SaveStatus>(SaveStatus.Idle);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [revision, setRevision] = useState(0);

  const editorRef = useRef<EditorViewRef>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const lastRequestIdRef = useRef<string | null>(null);
  const ignoreNextLoadRef = useRef(false);

  // To handle navigation blocking
  const pendingNavigationAction = useRef<any>(null);

  useEffect(() => {
      const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
      const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

      const onShow = () => setKeyboardVisible(true);
      const onHide = () => setKeyboardVisible(false);

      const showSub = Keyboard.addListener(showEvent, onShow);
      const hideSub = Keyboard.addListener(hideEvent, onHide);

      isMountedRef.current = true;
      loadNote();

      const onBeforeRemove = (e: any) => {
          if (!isDirty) {
              return;
          }

          // Prevent default behavior of leaving the screen
          e.preventDefault();

          // Trigger save and then navigate
          if (DEBUG) console.log('[NoteScreen] Navigation blocked due to dirty state. Saving...');

          pendingNavigationAction.current = e.data.action;
          requestSave();
      };

      // Add listener
      navigation.addListener('beforeRemove', onBeforeRemove);

      return () => {
          showSub.remove();
          hideSub.remove();
          isMountedRef.current = false;
          navigation.removeListener('beforeRemove', onBeforeRemove);
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      };
  }, [noteId]);

  const loadNote = async () => {
    if (!noteId) {
        setStatus('error');
        setErrorMsg('No note ID provided');
        return;
    }

    if (ignoreNextLoadRef.current) {
      ignoreNextLoadRef.current = false;
      return;
    }

    try {
        setStatus('loading');

        // Add to Recents
        await recentsStorage.add(noteId);

        const adapter = new MobileSandboxVaultAdapter();
        await adapter.init(); // Ensure root exists

        const result = await adapter.readNote(noteId);
        setContent(result.content);
        setLastSavedAt(result.mtimeMs);

        // Lazy Indexing: Upsert on open
        if (searchIndex) {
            try {
                await searchIndex.upsert({
                    id: noteId,
                    title: noteId.replace(/\.md$/, ''),
                    content: result.content,
                    mtimeMs: Date.now()
                });
            } catch (e: any) {
                console.warn('[NoteScreen] Lazy index failed', e);
            }
        }

        if (linkIndex) {
             try {
                 const links = parseWikilinks(result.content).map((match: any) => ({
                     source: noteId,
                     targetRaw: match.targetRaw,
                     targetPath: match.targetRaw
                 }));
                 await linkIndex.upsertLinks(noteId, links);
             } catch (e: any) {
                console.warn('[NoteScreen] Lazy link index failed', e);
             }
        }

        setStatus('ready');
    } catch (e: any) {
        setStatus('error');
        setErrorMsg(e.message || 'Failed to load note');
    }
  };

  const handleRename = async (newName: string) => {
    if (!noteId) return;

    try {
        await renameNote({
            noteId,
            newName,
            content,
            searchIndex,
            linkIndex,
            router,
            ignoreNextLoadRef
        });
    } catch (e: unknown) {
       // Error handled in util but rethrown for UI alert
       if (e instanceof Error) {
           throw e;
       }
       throw new Error(String(e));
    }
  };

  const handleEditorReady = () => {
    if (!editorRef.current) return;

    // 1. Send Init
    editorRef.current.sendCommand(EditorCommand.Init, {
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        readOnly: false,
        theme: {
            name: theme.name, // Use active theme name from context
            vars: theme.variables // Use resolved theme variables from context
        },
        settings: {
            showLineNumbers: settings.editor.showLineNumbers,
            highlightActiveLine: settings.editor.highlightActiveLine,
            wordWrap: settings.editor.wordWrap
        },
        featureFlags: {
            links: true
        }
    });

    // 2. Send Content
    editorRef.current.sendCommand(EditorCommand.Set, {
        docId: noteId!,
        text: content,
    });

    // Reset revision tracking
    setRevision(0);
    setIsDirty(false);
    setSaveStatus(SaveStatus.Idle);
  };

  const requestSave = () => {
    if (!editorRef.current || !noteId) return;

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
      if (DEBUG) console.log('[NoteScreen] DocChanged:', payload);
      setRevision(payload.revision);
      setIsDirty(true);
      if (saveStatus !== SaveStatus.Error) {
        setSaveStatus(SaveStatus.Idle);
      }

      if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
          requestSave();
      }, 1000);
  };

  const handleRequestResponse = async (payload: RequestResponsePayload) => {
      if (DEBUG) console.log('[NoteScreen] Save Response:', payload);
      if (payload.requestId !== lastRequestIdRef.current) {
          return;
      }

      if (!payload.state.text && payload.state.text !== '') {
          console.warn('[NoteScreen] Received empty text in response');
          return;
      }

      const textToSave = payload.state.text ?? '';

      try {
          const adapter = new MobileSandboxVaultAdapter();
          await adapter.writeNote(noteId!, textToSave);
          const saveTime = Date.now();

          if (searchIndex) {
              try {
                  await searchIndex.upsert({
                      id: noteId!,
                      title: noteId!.replace(/\.md$/, ''),
                      content: textToSave,
                      mtimeMs: saveTime
                  });
              } catch (e: any) {
                  console.warn('[NoteScreen] Index on save failed', e);
              }
          }

          if (linkIndex) {
              try {
                  const links = parseWikilinks(textToSave).map((match: any) => ({
                      source: noteId!,
                      targetRaw: match.targetRaw,
                      targetPath: match.targetRaw
                  }));
                  await linkIndex.upsertLinks(noteId!, links);
              } catch (e: any) {
                 console.warn('[NoteScreen] Link index on save failed', e);
              }
          }

          if (isMountedRef.current) {
              setSaveStatus(SaveStatus.Saved);
              setLastSavedAt(saveTime);
              if (!saveTimerRef.current) {
                setIsDirty(false);
              }
          }

          if (pendingNavigationAction.current) {
              const action = pendingNavigationAction.current;
              pendingNavigationAction.current = null;
              navigation.dispatch(action);
          }

      } catch (e: any) {
          console.error('[NoteScreen] Save failed:', e);
          if (isMountedRef.current) {
              setSaveStatus(SaveStatus.Error);
          }
      }
  };

  if (status === 'loading') {
      return (
          <View style={[styles.centerContainer, { backgroundColor: paperTheme.colors.background }]}>
              <ActivityIndicator size="large" animating={true} color={paperTheme.colors.primary} />
              <Text style={[styles.statusText, { color: paperTheme.colors.onSurfaceVariant }]}>Loading note...</Text>
          </View>
      );
  }

  if (status === 'error') {
      return (
          <View style={[styles.centerContainer, { backgroundColor: paperTheme.colors.background }]}>
              <Text style={[styles.errorText, { color: paperTheme.colors.error }]}>Error: {errorMsg}</Text>
              <Text style={[styles.detailText, { color: paperTheme.colors.onSurfaceVariant }]}>ID: {noteId}</Text>
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
    <SafeAreaView style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <Stack.Screen
          options={{
              headerShown: false // We use custom header inside SafeAreaView or could use Stack header
          }}
      />

      {/* Header / Debug Bar */}
      <View style={[styles.header, { borderBottomColor: paperTheme.colors.outlineVariant, backgroundColor: paperTheme.colors.surface }]}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
             <Text style={{ fontSize: 24, color: paperTheme.colors.onSurface }}>←</Text>
          </TouchableOpacity>

          <EditableHeaderTitle
             title={noteId?.split('/').pop()?.replace(/\.md$/i, '') || ''}
             onRename={handleRename}
             disabled={isDirty} // Disable rename while unsaved changes exist to prevent sync issues
          />

          <View style={styles.badges}>
              {saveStatus !== SaveStatus.Idle && (
                   <Text style={[styles.badge, { color: SaveStatusColours[saveStatus], backgroundColor: 'transparent' }]}>
                       {getSaveStatusText()}
                   </Text>
              )}

              {DEBUG && <Text style={[styles.badge, { color: paperTheme.colors.onSurfaceVariant, backgroundColor: paperTheme.colors.surfaceVariant }]}>Rev: {revision}</Text>}
              {isDirty && <Text style={[styles.badge, styles.dirtyBadge, { backgroundColor: paperTheme.colors.errorContainer, color: paperTheme.colors.onErrorContainer }]}>Dirty</Text>}
          </View>
          <TouchableOpacity onPress={() => requestSave()} style={[styles.saveButton, { backgroundColor: paperTheme.colors.primary }]}>
             <Text style={[styles.saveButtonText, { color: paperTheme.colors.onPrimary }]}>Save</Text>
          </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        style={{ flex: 1 }}
      >
          {/* Editor */}
          <EditorView
            ref={editorRef}
            onReady={handleEditorReady}
            onDocChanged={handleDocChanged}
            onRequestResponse={handleRequestResponse}
            onError={(e) => console.error('Editor Error:', e)}
            // We can pass styles to inject theme vars but EditorView handles internal protocol theme
          />

          {/* Formatting Toolbar */}
          <FormattingToolbar editorRef={editorRef as React.RefObject<EditorViewRef>} />

          {/* Footer */}
          <LastSavedFooter timestamp={lastSavedAt} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
  },
  header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
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
      borderRadius: 4,
      overflow: 'hidden',
  },
  dirtyBadge: {
      // Colors handled in render
  },
  footer: {
      padding: 8,
      borderTopWidth: 1,
      alignItems: 'center',
  },
  saveButton: {
      marginLeft: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 4,
  },
  saveButtonText: {
      fontSize: 14,
      fontWeight: '600',
  }
});
