import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { TagId, Tag } from '@liminal-notes/core-shared/tags';
import { useTags } from '../context/TagsContext';
import { useTheme } from '../context/ThemeContext';
// import { XMarkIcon } from 'react-native-heroicons/outline'; // Need to check if available or use text 'x'

interface NoteTagsProps {
    tags: TagId[];
    onRemove?: (tagId: TagId) => void;
    onAdd?: () => void;
}

export function NoteTags({ tags, onRemove, onAdd }: NoteTagsProps) {
    const { tags: tagDefs } = useTags();
    const { resolveColor } = useTheme();

    if (tags.length === 0 && !onAdd) return null;

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container} contentContainerStyle={styles.contentContainer}>
            {tags.map(tagId => {
                const def = tagDefs[tagId];
                const displayName = def ? def.displayName : tagId;
                const color = def?.color || resolveColor('--ln-accent');

                // Color mix approximation for React Native
                // We'll use the color for text/border and a low opacity background if possible,
                // or just the border style similar to desktop.
                // React Native doesn't support 'color-mix' directly in styles efficiently without worklets/reanimated or parsing.
                // We'll just set border and text color for MVP cleanliness.

                return (
                    <TouchableOpacity
                        key={tagId}
                        style={[styles.tag, { borderColor: color }]}
                        onPress={() => { /* Navigate or show info? */ }}
                    >
                        <View style={[styles.dot, { backgroundColor: color }]} />
                        <Text style={[styles.text, { color: resolveColor('--ln-fg') }]}>{displayName}</Text>
                        {onRemove && (
                             <TouchableOpacity onPress={() => onRemove(tagId)} style={styles.removeBtn}>
                                <Text style={{ color: resolveColor('--ln-muted'), fontSize: 12 }}>×</Text>
                             </TouchableOpacity>
                        )}
                    </TouchableOpacity>
                );
            })}

            {onAdd && (
                <TouchableOpacity onPress={onAdd} style={[styles.tag, { borderColor: resolveColor('--ln-muted'), borderStyle: 'dashed' }]}>
                    <Text style={[styles.text, { color: resolveColor('--ln-muted') }]}>+ Tag</Text>
                </TouchableOpacity>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        maxHeight: 40,
        marginBottom: 8,
        flexGrow: 0,
    },
    contentContainer: {
        paddingHorizontal: 16,
        alignItems: 'center',
        gap: 8
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
        height: 24,
        marginRight: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    text: {
        fontSize: 12,
    },
    removeBtn: {
        marginLeft: 6,
        padding: 2,
    }
});
