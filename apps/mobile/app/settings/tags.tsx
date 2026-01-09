import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { useTags } from '../../src/context/TagsContext';
import { useTheme as usePaperTheme } from 'react-native-paper';
import { Tag } from '@liminal-notes/core-shared/tags';
// Icons removed to avoid dependency issues if not installed. Using Text buttons for MVP.

export default function TagSettingsScreen() {
    const { resolveColor } = useTheme();
    const paperTheme = usePaperTheme();
    const { tags, updateTag, deleteTag } = useTags();
    const router = useRouter();
    const [filter, setFilter] = useState('');

    const sortedTags = useMemo(() => {
        return Object.values(tags)
            .filter(t => t.displayName.toLowerCase().includes(filter.toLowerCase()))
            .sort((a, b) => a.displayName.localeCompare(b.displayName));
    }, [tags, filter]);

    const handleEdit = (tag: Tag) => {
        Alert.prompt(
            'Rename Tag',
            `Enter new display name for #${tag.id}`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Save',
                    onPress: (newName: string | undefined) => {
                        const name = newName || '';
                        if (name && name.trim()) {
                            updateTag({ ...tag, displayName: name.trim() });
                        }
                    }
                }
            ],
            'plain-text',
            tag.displayName
        );
    };

    const handleChangeColor = (tag: Tag) => {
        // Simple prompt for hex code for MVP
        // A full color picker is better but requires external lib
        Alert.prompt(
            'Change Color',
            'Enter hex color (e.g. #FF0000)',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Save',
                    onPress: (colorInput: string | undefined) => {
                        const color = colorInput || '';
                        if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) {
                            updateTag({ ...tag, color });
                        } else if (color) {
                            Alert.alert('Invalid Color', 'Please use hex format like #RRGGBB');
                        }
                    }
                }
            ],
            'plain-text',
            tag.color || ''
        );
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
