import { View, Text, StyleSheet, Button, ScrollView, TextInput } from 'react-native';
import { useState } from 'react';
import { MobileSandboxVaultAdapter } from '../../src/adapters/MobileSandboxVaultAdapter';
import type { NoteId } from '@liminal-notes/core-shared/src/types';

export default function SandboxTestScreen() {
  const [logs, setLogs] = useState<string[]>([]);
  const [adapter] = useState(() => new MobileSandboxVaultAdapter());
  const [filename, setFilename] = useState('test.md');
  const [content, setContent] = useState('# Hello Sandbox');

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const handleInit = async () => {
    try {
      await adapter.init();
      addLog('Initialized adapter');
    } catch (e: any) {
      addLog(`Error init: ${e.message}`);
    }
  };

  const handleList = async () => {
    try {
      const files = await adapter.listFiles();
      addLog(`Files: ${JSON.stringify(files.map(f => f.id), null, 2)}`);
    } catch (e: any) {
      addLog(`Error listing: ${e.message}`);
    }
  };

  const handleWrite = async () => {
    try {
      await adapter.writeNote(filename as NoteId, content, { createParents: true });
      addLog(`Wrote to ${filename}`);
    } catch (e: any) {
      addLog(`Error writing: ${e.message}`);
    }
  };

  const handleRead = async () => {
    try {
      const res = await adapter.readNote(filename as NoteId);
      addLog(`Read ${filename}: ${res.content}`);
    } catch (e: any) {
      addLog(`Error reading: ${e.message}`);
    }
  };

  const handleRename = async () => {
    try {
        const newName = 'renamed_' + filename;
        await adapter.rename(filename as NoteId, newName as NoteId);
        addLog(`Renamed ${filename} to ${newName}`);
        setFilename(newName);
    } catch (e: any) {
        addLog(`Error renaming: ${e.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sandbox Vault Test</Text>

      <View style={styles.controls}>
        <TextInput
            style={styles.input}
            value={filename}
            onChangeText={setFilename}
            placeholder="Filename (e.g. test.md)"
        />
        <TextInput
            style={styles.input}
            value={content}
            onChangeText={setContent}
            placeholder="Content"
        />

        <View style={styles.row}>
            <Button title="Init" onPress={handleInit} />
            <Button title="List" onPress={handleList} />
        </View>
        <View style={styles.row}>
            <Button title="Write" onPress={handleWrite} />
            <Button title="Read" onPress={handleRead} />
        </View>
        <Button title="Rename to renamed_..." onPress={handleRename} />
      </View>

      <ScrollView style={styles.logs}>
        {logs.map((log, i) => (
          <Text key={i} style={styles.logItem}>{log}</Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 40,
  },
  controls: {
    gap: 10,
    marginBottom: 20,
  },
  input: {
      backgroundColor: 'white',
      padding: 10,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: '#ddd'
  },
  row: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      gap: 10,
  },
  logs: {
    flex: 1,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
  },
  logItem: {
    fontSize: 12,
    marginBottom: 5,
    fontFamily: 'monospace',
  }
});
