import { useTags } from '../../contexts/TagsContext';
import { usePluginHost } from '../../plugins/PluginHostProvider';
import { useState } from 'react';
import { Tag } from '../../types/tags';
import { HashtagIcon, XMarkIcon, PencilSquareIcon } from '../Icons';
import { confirm } from '@tauri-apps/plugin-dialog';

export function TagSettings() {
    const { tags, updateTag, deleteTag, removeTagFromAllNotes } = useTags();
    const { enabledPlugins } = usePluginHost();
    const [filter, setFilter] = useState('');
    const [editingTagId, setEditingTagId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const sorted = Object.values(tags)
        .filter(t => t.displayName.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => a.displayName.localeCompare(b.displayName));

    const handleDelete = async (tag: Tag) => {
        if (await confirm(`Delete tag definition "${tag.displayName}"? (This does not remove tags from notes)`, { kind: 'warning' })) {
             await deleteTag(tag.id);
        }
    };

    const handleRemoveUsages = async (tag: Tag) => {
        if (await confirm(`Remove tag "${tag.displayName}" from ALL notes? This cannot be undone.`, { kind: 'warning', title: 'Bulk Remove' })) {
             await removeTagFromAllNotes(tag.id);
        }
    };

    const startEdit = (tag: Tag) => {
        setEditingTagId(tag.id);
        setEditName(tag.displayName);
    };

    const saveEdit = async (tag: Tag) => {
        if (editName.trim()) {
            await updateTag({ ...tag, displayName: editName.trim() });
        }
        setEditingTagId(null);
    };

    return (
        <div className="tag-settings">
            <div style={{ marginBottom: '15px' }}>
                <input
                    type="text"
                    placeholder="Filter tags..."
                    className="form-input"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    style={{ width: '100%' }}
                />
            </div>
            <div className="tag-list-settings">
                {sorted.map(tag => (
                    <div key={tag.id} style={{ display: 'flex', alignItems: 'center', padding: '8px', borderBottom: '1px solid var(--ln-border)' }}>
                        <span style={{ color: tag.color || 'var(--ln-accent)', marginRight: '10px' }}>
                            <HashtagIcon size={16} />
                        </span>
                        <div style={{ flex: 1 }}>
                            {editingTagId === tag.id ? (
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    onBlur={() => saveEdit(tag)}
                                    onKeyDown={e => e.key === 'Enter' && saveEdit(tag)}
                                    autoFocus
                                    className="form-input"
                                    style={{ width: '100%', maxWidth: '300px' }}
                                />
                            ) : (
                                <div style={{ fontWeight: 'bold', cursor: 'pointer' }} onClick={() => startEdit(tag)} title="Click to rename">
                                    {tag.displayName}
                                </div>
                            )}
                            <div style={{ fontSize: '0.8em', color: 'var(--ln-muted)' }}>{tag.id}</div>
                            {enabledPlugins.has('ai-assistant') && (
                                <div style={{ fontSize: '0.8em', marginTop: '4px', display: 'flex', alignItems: 'center' }}>
                                    <label className="toggle-switch" style={{ marginRight: '8px', transform: 'scale(0.7)', transformOrigin: 'left center' }} title="Automatically apply this tag if AI suggests it">
                                        <input
                                            type="checkbox"
                                            checked={!!tag.aiAutoApprove}
                                            onChange={(e) => updateTag({ ...tag, aiAutoApprove: e.target.checked })}
                                        />
                                        <span className="slider"></span>
                                    </label>
                                    <span>Auto-approve</span>
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                             <input
                                type="color"
                                value={tag.color || '#646cff'} // Default accent color fallback
                                onChange={(e) => updateTag({ ...tag, color: e.target.value })}
                                title="Change Color"
                                style={{ width: '24px', height: '24px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                             />
                             <button onClick={() => startEdit(tag)} title="Rename Display Name" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ln-muted)' }}>
                                <PencilSquareIcon size={18} />
                             </button>
                             <button onClick={() => handleRemoveUsages(tag)} title="Remove from all notes" style={{ background: 'none', border: '1px solid var(--ln-border)', borderRadius: '3px', cursor: 'pointer', color: 'var(--ln-muted)', fontSize: '0.8em', padding: '2px 6px' }}>
                                Remove Usages
                             </button>
                             <button
                                onClick={() => handleDelete(tag)}
                                title="Delete Definition"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ln-muted)' }}
                             >
                                <XMarkIcon size={18} />
                             </button>
                        </div>
                    </div>
                ))}
                {sorted.length === 0 && <p style={{ color: 'var(--ln-muted)', textAlign: 'center' }}>No tags found.</p>}
            </div>
        </div>
    );
}
