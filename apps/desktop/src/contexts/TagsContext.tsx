import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Tag, TagId, TagIndex, TagCatalogue, TagIndexEntry } from '../types/tags';
import { listMarkdownFiles } from '../ipc';
import { desktopVault } from '../adapters/DesktopVaultAdapter';
import { normalizeTagId, deriveTagsFromPath, humanizeTagId } from '../utils/tags';
import { parseFrontmatter, updateFrontmatter } from '../utils/frontmatter';
import { FileEntry } from '../types';

interface TagsContextProps {
    tags: Record<TagId, Tag>;
    tagIndex: TagIndex;
    refreshIndex: (files?: FileEntry[]) => Promise<void>;
    addTag: (tagId: string) => Promise<void>;
    deleteTag: (tagId: string) => Promise<void>;
    updateTag: (tag: Tag) => Promise<void>;
    removeTagFromAllNotes: (tagId: string) => Promise<void>;
    getTagsForNote: (path: string) => TagId[];
    isLoading: boolean;
}

const TagsContext = createContext<TagsContextProps | undefined>(undefined);

export const useTags = () => {
    const context = useContext(TagsContext);
    if (!context) {
        throw new Error('useTags must be used within a TagsProvider');
    }
    return context;
};

const TAGS_FILE = '.liminal/tags.json';
const TAG_INDEX_FILE = '.liminal/tag-index.json';

export const TagsProvider = ({ children }: { children: ReactNode }) => {
    const [tags, setTags] = useState<Record<TagId, Tag>>({});
    const [tagIndex, setTagIndex] = useState<TagIndex>({});
    const [isLoading, setIsLoading] = useState(false);

    // Lock to prevent concurrent writes
    const isWritingTags = useRef(false);

    const tagsRef = useRef(tags);
    const tagIndexRef = useRef(tagIndex);

    useEffect(() => {
        tagsRef.current = tags;
    }, [tags]);

    useEffect(() => {
        tagIndexRef.current = tagIndex;
    }, [tagIndex]);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Load Catalogue
            let loadedTags: Record<TagId, Tag> = {};
            try {
                const { content: tagsContent } = await desktopVault.readNote(TAGS_FILE);
                loadedTags = JSON.parse(tagsContent);
            } catch (e) {
                // File might not exist
                console.log('No tags.json found, starting fresh.');
            }
            setTags(loadedTags);

            // Load Index
            let loadedIndex: TagIndex = {};
            try {
                const { content: indexContent } = await desktopVault.readNote(TAG_INDEX_FILE);
                loadedIndex = JSON.parse(indexContent);
            } catch (e) {
                console.log('No tag-index.json found.');
            }
            setTagIndex(loadedIndex);

        } catch (err) {
            console.error('Failed to load tags data:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const saveTags = async (newTags: Record<TagId, Tag>) => {
        if (isWritingTags.current) return; // Simple lock
        isWritingTags.current = true;
        try {
            await desktopVault.writeNote(TAGS_FILE, JSON.stringify(newTags, null, 2));
            setTags(newTags);
        } catch (e) {
            console.error("Failed to save tags:", e);
        } finally {
            isWritingTags.current = false;
        }
    };

    const saveIndex = async (newIndex: TagIndex) => {
        try {
            await desktopVault.writeNote(TAG_INDEX_FILE, JSON.stringify(newIndex, null, 2));
            setTagIndex(newIndex);
        } catch (e) {
            console.error("Failed to save tag index:", e);
        }
    };

    const addTag = async (input: string) => {
        const id = normalizeTagId(input);
        if (!id) return;

        if (tags[id]) return;

        const newTag: Tag = {
            id,
            displayName: input.trim(), // Use original casing/spacing as display name
            createdAt: Date.now()
        };

        const newTags = { ...tags, [id]: newTag };
        await saveTags(newTags);
    };

    const updateTag = async (tag: Tag) => {
        if (!tags[tag.id]) return;
        const newTags = { ...tags, [tag.id]: tag };
        await saveTags(newTags);
    };

    const deleteTag = async (tagId: string) => {
        const { [tagId]: _, ...remaining } = tags;
        await saveTags(remaining);
        // We probably should remove it from the index too, but index is derived from files.
        // Files still have the tag in frontmatter.
        // Spec says: "Delete tag (confirm)". This usually deletes the definition.
        // Removing from notes is a separate "Bulk remove" action.
    };

    const removeTagFromAllNotes = async (tagId: string) => {
        const updates: Promise<void>[] = [];

        for (const [path, entry] of Object.entries(tagIndex)) {
            if (entry.tags.includes(tagId)) {
                updates.push((async () => {
                     try {
                         const { content: originalContent } = await desktopVault.readNote(path);
                         const content = updateFrontmatter(originalContent, (data) => {
                             let tags = data.tags || [];
                             if (typeof tags === 'string') tags = [tags];
                             tags = tags.filter((t: any) => normalizeTagId(String(t)) !== tagId);
                             data.tags = tags;
                             if (data.liminal?.tagMeta?.[tagId]) {
                                 delete data.liminal.tagMeta[tagId];
                             }
                         });
                         await desktopVault.writeNote(path, content);
                     } catch (e) {
                         console.error(`Failed to remove tag ${tagId} from ${path}`, e);
                     }
                })());
            }
        }
        await Promise.all(updates);
        await refreshIndex();
    };

    const refreshIndex = useCallback(async (files?: FileEntry[]) => {
        if (!files) {
            try {
                files = await listMarkdownFiles();
            } catch (e) {
                console.error("Failed to list files for indexing:", e);
                return;
            }
        }

        const mdFiles = files.filter(f => !f.is_dir && f.path.endsWith('.md'));
        const newIndex: TagIndex = {};
        const discoveredTags: Record<TagId, Tag> = {};
        let tagsChanged = false;

        // Clone current tags to check for new ones
        const currentTags = { ...tagsRef.current };
        const currentTagIndex = tagIndexRef.current;

        // Process files (could be parallelized)
        await Promise.all(mdFiles.map(async (file) => {
            try {
                // Performance optimization: check mtime
                const existingEntry = currentTagIndex[file.path];
                if (existingEntry && existingEntry.mtime && file.mtime && existingEntry.mtime === file.mtime) {
                    newIndex[file.path] = existingEntry;
                    return;
                }

                const { content } = await desktopVault.readNote(file.path);
                const { data } = parseFrontmatter(content);

                let fileTags: TagId[] = [];

                // Frontmatter tags
                if (data.tags && Array.isArray(data.tags)) {
                    fileTags = data.tags.map((t: any) => normalizeTagId(String(t)));
                } else if (data.tags && typeof data.tags === 'string') {
                    // Handle single string case
                     fileTags = [normalizeTagId(data.tags)];
                }

                // Derived tags
                const folderTags = deriveTagsFromPath(file.path);

                // Merge
                const uniqueTags = new Set([...fileTags, ...folderTags]);
                const finalTags = Array.from(uniqueTags).sort();

                newIndex[file.path] = {
                    tags: finalTags,
                    mtime: file.mtime || Date.now()
                };

                // Discover new tags
                finalTags.forEach(t => {
                    if (!currentTags[t] && !discoveredTags[t]) {
                        discoveredTags[t] = {
                            id: t,
                            displayName: humanizeTagId(t),
                            createdAt: Date.now()
                        };
                        tagsChanged = true;
                    }
                });

            } catch (e) {
                console.error(`Failed to index tags for ${file.path}:`, e);
            }
        }));

        await saveIndex(newIndex);

        if (tagsChanged) {
             const updatedTags = { ...currentTags, ...discoveredTags };
             await saveTags(updatedTags);
        }

        // Reload tags locally to ensure state is sync
        if (tagsChanged) {
            setTags(prev => ({...prev, ...discoveredTags}));
        }

    }, []); // Stable callback using refs

    const getTagsForNote = useCallback((path: string): TagId[] => {
        if (tagIndex[path]) {
            return tagIndex[path].tags;
        }
        // Fallback to purely derived tags if not in index
        return deriveTagsFromPath(path);
    }, [tagIndex]);

    return (
        <TagsContext.Provider value={{
            tags,
            tagIndex,
            refreshIndex,
            addTag,
            deleteTag,
            updateTag,
            removeTagFromAllNotes,
            getTagsForNote,
            isLoading
        }}>
            {children}
        </TagsContext.Provider>
    );
};
