import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Button, Dialog, Portal, TextInput, Text, useTheme as usePaperTheme, Chip } from 'react-native-paper';
import { useTags } from '../context/TagsContext';
import { useTheme } from '../context/ThemeContext';
import { normalizeTagId } from '@liminal-notes/core-shared/tags';

interface AddTagDialogProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (tag: string) => void;
  excludeTags?: string[];
}

export function AddTagDialog({ visible, onClose, onSelect, excludeTags = [] }: AddTagDialogProps) {
  const [input, setInput] = useState('');
  const { tags } = useTags();
  const { resolveColor } = useTheme();
  const paperTheme = usePaperTheme();

  const filteredTags = useMemo(() => {
    const normalizedInput = normalizeTagId(input);
    const excludeSet = new Set(excludeTags);

    return Object.values(tags)
      .filter(t => !excludeSet.has(t.id))
      .filter(t => t.id.includes(normalizedInput) || t.displayName.toLowerCase().includes(input.toLowerCase()))
      .slice(0, 10); // Limit results
  }, [tags, input, excludeTags]);

  const handleCreate = () => {
      if (input.trim()) {
          onSelect(input.trim());
          onClose();
          setInput('');
      }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onClose} style={{ backgroundColor: resolveColor('--ln-menu-bg') || paperTheme.colors.surface }}>
        <Dialog.Title style={{ color: resolveColor('--ln-fg') }}>Add Tag</Dialog.Title>
        <Dialog.Content>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Search or create tag..."
            autoFocus
            mode="outlined"
            textColor={resolveColor('--ln-fg')}
            style={{ backgroundColor: resolveColor('--ln-bg') }}
            theme={{ colors: { primary: resolveColor('--ln-accent') } }}
            onSubmitEditing={handleCreate}
          />

          <ScrollView style={{ maxHeight: 200, marginTop: 10 }} keyboardShouldPersistTaps="handled">
             {filteredTags.map(tag => (
                 <TouchableOpacity
                    key={tag.id}
                    onPress={() => { onSelect(tag.id); onClose(); setInput(''); }}
                    style={styles.tagItem}
                 >
                     <View style={[styles.dot, { backgroundColor: tag.color || resolveColor('--ln-accent') }]} />
                     <Text style={{ color: resolveColor('--ln-fg') }}>{tag.displayName}</Text>
                 </TouchableOpacity>
             ))}

             {input.trim().length > 0 && !filteredTags.find(t => t.displayName.toLowerCase() === input.trim().toLowerCase()) && (
                 <TouchableOpacity onPress={handleCreate} style={styles.createItem}>
                     <Text style={{ color: resolveColor('--ln-accent'), fontStyle: 'italic' }}>+ Create "{input}"</Text>
                 </TouchableOpacity>
             )}
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onClose} textColor={resolveColor('--ln-muted')}>Cancel</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
    tagItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#ccc2',
    },
    createItem: {
        paddingVertical: 12,
        paddingHorizontal: 4,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    }
});
