import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { useTags } from '../../src/context/TagsContext';
import { useTheme as usePaperTheme } from 'react-native-paper';
import { Tag } from '@liminal-notes/core-shared/tags';
import { PromptDialog } from '../../src/components/PromptDialog';
// Icons removed to avoid dependency issues if not installed. Using Text buttons for MVP.

export default function TagSettingsScreen() {
    const { resolveColor } = useTheme();
    const paperTheme = usePaperTheme();
    const { tags, updateTag, deleteTag } = useTags();
    const router = useRouter();
    const [filter, setFilter] = useState('');

    // Dialog State
    const [editDialog, setEditDialog] = useState<{ visible: boolean; tag: Tag | null }>({ visible: false, tag: null });
    const [colorDialog, setColorDialog] = useState<{ visible: boolean; tag: Tag | null }>({ visible: false, tag: null });

    const sortedTags = useMemo(() => {
        return Object.values(tags)
            .filter(t => t.displayName.toLowerCase().includes(filter.toLowerCase()))
            .sort((a, b) => a.displayName.localeCompare(b.displayName));
    }, [tags, filter]);

    const handleEdit = (tag: Tag) => {
        setEditDialog({ visible: true, tag });
    };

    const handleChangeColor = (tag: Tag) => {
        setColorDialog({ visible: true, tag });
    };

    const handleDelete = (tagId: string) => {
        Alert.alert(
            'Delete Tag',
            'Are you sure you want to delete this tag definition? Notes will keep the tag in their text.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteTag(tagId)
                }
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: resolveColor('--ln-bg') }]} edges={['bottom', 'left', 'right']}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Tags',
                    headerTintColor: resolveColor('--ln-accent'),
                    headerStyle: { backgroundColor: resolveColor('--ln-bg') }
                }}
            />
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: resolveColor('--ln-border') }}>
                <TextInput
                    style={[styles.input, { color: resolveColor('--ln-fg'), borderColor: resolveColor('--ln-border'), backgroundColor: resolveColor('--ln-surface') }]}
                    placeholder="Filter tags..."
                    placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                    value={filter}
                    onChangeText={setFilter}
                    selectionColor={paperTheme.colors.primary}
                    cursorColor={paperTheme.colors.primary}
                />
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {sortedTags.map(tag => (
                    <View key={tag.id} style={[styles.row, { borderBottomColor: resolveColor('--ln-border') }]}>
                        <TouchableOpacity
                            style={[styles.colorDot, { backgroundColor: tag.color || resolveColor('--ln-accent') }]}
                            onPress={() => handleChangeColor(tag)}
                        />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.tagName, { color: resolveColor('--ln-fg') }]}>{tag.displayName}</Text>
                            <Text style={{ fontSize: 12, color: paperTheme.colors.onSurfaceVariant }}>{tag.id}</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleEdit(tag)} style={{ padding: 8 }}>
                            <Text style={{ color: resolveColor('--ln-accent') }}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(tag.id)} style={{ padding: 8 }}>
                            <Text style={{ color: paperTheme.colors.error }}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                ))}
                {sortedTags.length === 0 && (
                    <Text style={{ padding: 20, textAlign: 'center', color: paperTheme.colors.onSurfaceVariant }}>No tags found.</Text>
                )}
            </ScrollView>

            <PromptDialog
                visible={editDialog.visible}
                title="Rename Tag"
                message={`Enter new display name for #${editDialog.tag?.id}`}
                defaultValue={editDialog.tag?.displayName}
                onClose={() => setEditDialog({ visible: false, tag: null })}
                onSubmit={(newName) => {
                    if (newName && newName.trim() && editDialog.tag) {
                        updateTag({ ...editDialog.tag, displayName: newName.trim() });
                    }
                }}
            />

            <PromptDialog
                visible={colorDialog.visible}
                title="Change Color"
                message="Enter hex color (e.g. #FF0000)"
                defaultValue={colorDialog.tag?.color || ''}
                placeholder="#RRGGBB"
                onClose={() => setColorDialog({ visible: false, tag: null })}
                onSubmit={(colorInput) => {
                    if (colorInput && /^#[0-9A-Fa-f]{6}$/.test(colorInput) && colorDialog.tag) {
                        updateTag({ ...colorDialog.tag, color: colorInput });
                    } else if (colorInput) {
                        Alert.alert('Invalid Color', 'Please use hex format like #RRGGBB');
                    }
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    input: {
        height: 40,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    colorDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    tagName: {
        fontSize: 16,
        fontWeight: '500',
    }
});
