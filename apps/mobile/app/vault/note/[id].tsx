import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, SafeAreaView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { EditorView, EditorViewRef } from '@/components/EditorView';
import { MobileSandboxVaultAdapter } from '@/adapters/MobileSandboxVaultAdapter';
import { EditorCommand, DocChangedPayload } from '@liminal-notes/core-shared/mobile/editorProtocol';

// Minimal theme to satisfy protocol (values will override fallbacks if provided)
const LIGHT_THEME = {
  name: 'light',
  vars: {
    '--ln-bg': '#ffffff',
    '--ln-fg': '#333333',
    '--ln-accent': '#0066cc',
    // ... add others if needed, for now relying on editor's fallback for the rest
  }
};

export default function NoteScreen() {
  const { id } = useLocalSearchParams();
  const noteId = Array.isArray(id) ? id[0] : id; // Handle potential array from params

  const editorRef = useRef<EditorViewRef>(null);

  // State
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');

  // Verification State
  const [revision, setRevision] = useState<number>(0);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  useEffect(() => {
    loadNote();
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
        theme: LIGHT_THEME,
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
  };

  const handleDocChanged = (payload: DocChangedPayload) => {
      setRevision(payload.revision);
      setIsDirty(true);
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header / Debug Bar */}
      <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{noteId}</Text>
          <View style={styles.badges}>
              <Text style={styles.badge}>Rev: {revision}</Text>
              {isDirty && <Text style={[styles.badge, styles.dirtyBadge]}>Dirty</Text>}
          </View>
      </View>

      {/* Editor */}
      <EditorView
        ref={editorRef}
        onReady={handleEditorReady}
        onDocChanged={handleDocChanged}
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
