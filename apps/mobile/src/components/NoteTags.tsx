import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, useTheme } from 'react-native-paper';
import { TagId } from '@liminal-notes/core-shared/tags';
import { useTags } from '../context/TagsContext';

interface NoteTagsProps {
    tags: TagId[];
    onRemove?: (tagId: TagId) => void;
    onAdd?: () => void;
}

export function NoteTags({ tags, onRemove, onAdd }: NoteTagsProps) {
    const { tags: tagDefs } = useTags();
    const theme = useTheme();

    if (tags.length === 0 && !onAdd) return null;

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container} contentContainerStyle={styles.contentContainer}>
            {tags.map(tagId => {
                const def = tagDefs[tagId];
                const displayName = def ? def.displayName : tagId;
                const color = def?.color || theme.colors.primary;

                return (
                    <Chip
                        key={tagId}
                        mode="outlined"
                        onClose={onRemove ? () => onRemove(tagId) : undefined}
                        style={[styles.chip, { borderColor: color }]}
                        textStyle={{ color: theme.colors.onSurface }}
                        // Chip doesn't support custom dot easily without 'icon'
                        // We can use the 'icon' prop to show the dot color
                        icon={() => <View style={[styles.dot, { backgroundColor: color }]} />}
                        onPress={() => { /* Navigate or filter? */ }}
                    >
                        {displayName}
                    </Chip>
                );
            })}

            {onAdd && (
                <Chip
                    mode="outlined"
                    onPress={onAdd}
                    style={[styles.chip, { borderStyle: 'dashed', borderColor: theme.colors.onSurfaceDisabled }]}
                    textStyle={{ color: theme.colors.onSurfaceVariant }}
                    icon="plus"
                >
                    Tag
                </Chip>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        maxHeight: 60, // Increased to prevent cutoff
        marginBottom: 8,
        flexGrow: 0,
    },
    contentContainer: {
        paddingHorizontal: 16,
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8 // Increased padding
    },
    chip: {
        // height: 32, // Let it size naturally or increase if needed
        backgroundColor: 'transparent'
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    }
});
