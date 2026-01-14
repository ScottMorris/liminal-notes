import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { useTags } from '../../src/context/TagsContext';
import { useTheme as usePaperTheme, TextInput, List, IconButton, Text, Surface } from 'react-native-paper';
import { Tag } from '@liminal-notes/core-shared/tags';
import { PromptDialog } from '../../src/components/PromptDialog';

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
            <View style={{ padding: 16 }}>
                <TextInput
                    mode="outlined"
                    label="Filter tags..."
                    value={filter}
                    onChangeText={setFilter}
                    style={{ backgroundColor: resolveColor('--ln-bg') }}
                    textColor={resolveColor('--ln-fg')}
                    theme={{ colors: { primary: resolveColor('--ln-accent'), onSurfaceVariant: resolveColor('--ln-muted') } }}
                    activeOutlineColor={resolveColor('--ln-accent')}
                    outlineColor={resolveColor('--ln-border')}
                    selectionColor={resolveColor('--ln-accent')}
                    cursorColor={resolveColor('--ln-accent')}
                />
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {sortedTags.map(tag => (
                    <List.Item
                        key={tag.id}
                        title={tag.displayName}
                        description={`#${tag.id}`}
                        left={props => (
                            <TouchableOpacity onPress={() => handleChangeColor(tag)}>
                                <View
                                    style={[
                                        styles.colorDot,
                                        { backgroundColor: tag.color || resolveColor('--ln-accent'), margin: 8 }
                                    ]}
                                />
                            </TouchableOpacity>
                        )}
                        right={props => (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <IconButton icon="pencil" size={20} onPress={() => handleEdit(tag)} iconColor={resolveColor('--ln-accent')} />
                                <IconButton icon="delete" size={20} onPress={() => handleDelete(tag.id)} iconColor={paperTheme.colors.error} />
                            </View>
                        )}
                        style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: resolveColor('--ln-border') }}
                        titleStyle={{ color: resolveColor('--ln-fg') }}
                        descriptionStyle={{ color: paperTheme.colors.onSurfaceVariant }}
                    />
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
    colorDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
});
