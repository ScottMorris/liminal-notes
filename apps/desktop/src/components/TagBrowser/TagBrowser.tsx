import { useTags } from '../../contexts/TagsContext';
import { TagRow } from './TagRow';
import { useState, useMemo } from 'react';
import { Tag } from '../../types/tags';
import { confirm } from '@tauri-apps/plugin-dialog';

interface TagBrowserProps {
    onFileSelect: (path: string) => void;
}

export function TagBrowser({ onFileSelect }: TagBrowserProps) {
    const { tags, tagIndex, deleteTag } = useTags();
    const [filter, setFilter] = useState('');

    const tagMap = useMemo(() => {
        const map = new Map<string, string[]>();
        Object.entries(tagIndex).forEach(([path, entry]) => {
            entry.tags.forEach(tagId => {
                if (!map.has(tagId)) map.set(tagId, []);
                map.get(tagId)?.push(path);
            });
        });
        Object.keys(tags).forEach(tagId => {
             if (!map.has(tagId)) map.set(tagId, []);
        });
        return map;
    }, [tagIndex, tags]);

    const sortedTags = useMemo(() => {
        const list = Object.values(tags);
        const filtered = list.filter(t =>
            t.displayName.toLowerCase().includes(filter.toLowerCase()) ||
            t.id.includes(filter.toLowerCase())
        );
        filtered.sort((a, b) => a.displayName.localeCompare(b.displayName));
        return filtered;
    }, [tags, filter]);

    const handleContextMenu = async (e: React.MouseEvent, tag: Tag) => {
        e.preventDefault();
        // Simple delete for MVP - right click to delete
        const yes = await confirm(`Delete tag "${tag.displayName}"?`, { title: 'Delete Tag', kind: 'warning' });
        if (yes) {
            await deleteTag(tag.id);
        }
    };

    return (
        <div className="tag-browser" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="tag-filter" style={{ padding: '10px', borderBottom: '1px solid var(--ln-border)' }}>
                <input
                    type="text"
                    placeholder="Filter tags..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="form-input"
                    style={{ width: '100%' }}
                />
            </div>
            <div className="tag-list" style={{ overflowY: 'auto', flex: 1, padding: '5px 0' }}>
                {sortedTags.map(tag => (
                    <TagRow
                        key={tag.id}
                        tag={tag}
                        count={tagMap.get(tag.id)?.length || 0}
                        notes={tagMap.get(tag.id) || []}
                        onSelectNote={onFileSelect}
                        onContextMenu={handleContextMenu}
                    />
                ))}
                 {sortedTags.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ln-muted)' }}>
                        No tags found.
                    </div>
                )}
            </div>
        </div>
    );
}
