import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Tag, TagId, TagCatalogue } from '@liminal-notes/core-shared/tags';
import { useVault } from './VaultContext';
import { useIndex } from './IndexContext';
import { MobileSandboxVaultAdapter } from '../adapters/MobileSandboxVaultAdapter';
import { humanizeTagId, normalizeTagId } from '@liminal-notes/core-shared/tags';

interface TagsContextType {
    tags: Record<TagId, Tag>;
    isLoading: boolean;
    addTag: (input: string) => Promise<void>;
    updateTag: (tag: Tag) => Promise<void>;
    deleteTag: (tagId: string) => Promise<void>;
    refreshTags: () => Promise<void>;
}

const TagsContext = createContext<TagsContextType | undefined>(undefined);

const TAGS_FILE = '.liminal/tags.json';

export function TagsProvider({ children }: { children: React.ReactNode }) {
    const { activeVault } = useVault();
    const { tagIndex } = useIndex(); // Used to trigger syncs if needed, or we just rely on IndexContext populating DB
    const [tags, setTags] = useState<Record<TagId, Tag>>({});
    const [isLoading, setIsLoading] = useState(false);
    const isWritingRef = useRef(false);

    // Initial Load
    const loadTags = useCallback(async () => {
        if (!activeVault) return;
        setIsLoading(true);
        try {
            const adapter = new MobileSandboxVaultAdapter();
            await adapter.init();

            // 1. Read from JSON (Source of Truth for definitions)
            let loadedTags: Record<TagId, Tag> = {};
            try {
                const { content } = await adapter.readNote(TAGS_FILE);
                loadedTags = JSON.parse(content);
            } catch (e) {
                // Ignore missing file
            }

            // 2. Sync to DB
            if (tagIndex) {
                // Clear DB tags and re-insert? Or merge?
                // For MVP, definitions in JSON override DB.
                // But DB might have discovered tags from Index scan that are NOT in JSON yet?
                // The Desktop logic adds discovered tags to JSON.
                // We should do the same: if IndexContext finds a new tag, it should probably add it.
                // For now, let's just push JSON -> DB so the UI can query DB efficiently if it wants.
                // But TagsContext uses the 'tags' state which comes from JSON.

                // Let's just keep 'tags' state synced with JSON.
                setTags(loadedTags);

                // Also update DB for joins
                for (const tag of Object.values(loadedTags)) {
                    await tagIndex.upsertTag(tag);
                }
            } else {
                 setTags(loadedTags);
            }

        } catch (e) {
            console.error('[Tags] Failed to load tags:', e);
        } finally {
            setIsLoading(false);
        }
    }, [activeVault, tagIndex]);

    useEffect(() => {
        loadTags();
    }, [loadTags]);

    const saveTags = async (newTags: Record<TagId, Tag>) => {
        if (isWritingRef.current) return;
        isWritingRef.current = true;
        try {
            const adapter = new MobileSandboxVaultAdapter();
            await adapter.writeNote(TAGS_FILE, JSON.stringify(newTags, null, 2));
            setTags(newTags);

            // Update DB
            if (tagIndex) {
                 for (const tag of Object.values(newTags)) {
                    await tagIndex.upsertTag(tag);
                }
            }
        } catch (e) {
            console.error('[Tags] Failed to save tags:', e);
        } finally {
            isWritingRef.current = false;
        }
    };

    const addTag = async (input: string) => {
        const id = normalizeTagId(input);
        if (!id || tags[id]) return;

        const newTag: Tag = {
            id,
            displayName: input.trim(),
            createdAt: Date.now()
        };

        await saveTags({ ...tags, [id]: newTag });
    };

    const updateTag = async (tag: Tag) => {
        if (!tags[tag.id]) return;
        await saveTags({ ...tags, [tag.id]: tag });
    };

    const deleteTag = async (tagId: string) => {
        const { [tagId]: _, ...remaining } = tags;
        await saveTags(remaining);
        if (tagIndex) {
            await tagIndex.deleteTag(tagId);
        }
    };

    return (
        <TagsContext.Provider value={{ tags, isLoading, addTag, updateTag, deleteTag, refreshTags: loadTags }}>
            {children}
        </TagsContext.Provider>
    );
}

export function useTags() {
    const context = useContext(TagsContext);
    if (!context) throw new Error('useTags must be used within TagsProvider');
    return context;
}
