import { View, Text, StyleSheet, Button, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useIndex } from '../src/context/IndexContext';
import { SearchResult } from '@liminal-notes/core-shared/indexing/types';

export default function SearchScreen() {
  const router = useRouter();
  const { searchIndex, isIndexing } = useIndex();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query.trim() || !searchIndex) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const hits = await searchIndex.search(query, { limit: 20 });
        setResults(hits);
      } catch (e) {
        console.error('Search failed', e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchIndex]);

  const handlePress = (id: string) => {
    // Navigate to note
    // Note: This relies on the convention that id is a path relative to vault
    // but without extension in the route (or URL encoded)
    // Actually the router.push path for note is /vault/note/[id]
    router.push({
        pathname: '/vault/note/[id]',
        params: { id: id }
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
            style={styles.input}
            placeholder="Search notes..."
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCapitalize="none"
        />
        {isSearching && <ActivityIndicator style={{ marginLeft: 8 }} />}
      </View>

      {isIndexing && (
          <View style={styles.indexingBanner}>
              <ActivityIndicator size="small" color="#666" />
              <Text style={styles.indexingText}>Indexing in background...</Text>
          </View>
      )}

      <FlatList
        data={results}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultItem} onPress={() => handlePress(item.id)}>
                <Text style={styles.resultTitle}>{item.id.replace(/\.md$/, '')}</Text>
                <Text style={styles.resultMeta}>Score: {item.score}</Text>
            </TouchableOpacity>
        )}
        ListEmptyComponent={
            query ? (
                <Text style={styles.emptyText}>No results found.</Text>
            ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  resultItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
  },
  resultTitle: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 4,
  },
  resultMeta: {
      fontSize: 12,
      color: '#888',
  },
  emptyText: {
      padding: 20,
      textAlign: 'center',
      color: '#888',
  },
  indexingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      backgroundColor: '#f9f9f9',
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
      justifyContent: 'center',
  },
  indexingText: {
      marginLeft: 8,
      fontSize: 12,
      color: '#666',
  }
});
