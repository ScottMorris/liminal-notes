import { useState } from 'react';
import { Tag } from '@liminal-notes/core-shared/tags';
import { ChevronDownIcon, HashtagIcon } from '../Icons';

interface TagRowProps {
    tag: Tag;
    count: number;
    notes: string[]; // Paths
    onSelectNote: (path: string) => void;
    onContextMenu: (e: React.MouseEvent, tag: Tag) => void;
}

export function TagRow({ tag, count, notes, onSelectNote, onContextMenu }: TagRowProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="tag-row">
            <div
                className="tag-header"
                onClick={() => setExpanded(!expanded)}
                onContextMenu={(e) => onContextMenu(e, tag)}
                style={{
                    display: 'flex', alignItems: 'center', padding: '4px 8px', cursor: 'pointer',
                    userSelect: 'none'
                }}
            >
                <span style={{
                    transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.1s',
                    marginRight: '4px',
                    display: 'flex',
                    color: 'var(--ln-muted)'
                }}>
                    <ChevronDownIcon size={12} />
                </span>
                <span style={{
                    marginRight: '6px',
                    color: tag.color || 'var(--ln-accent)',
                    display: 'flex'
                }}>
                    <HashtagIcon size={14} />
                </span>
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tag.displayName}</span>
                <span style={{ fontSize: '0.8em', color: 'var(--ln-muted)', marginLeft: '4px' }}>{count}</span>
            </div>
            {expanded && (
                <div className="tag-notes" style={{ paddingLeft: '24px' }}>
                    {notes.map(path => {
                        const name = path.split('/').pop()?.replace('.md', '') || path;
                        return (
                            <div
                                key={path}
                                className="tag-note-item"
                                onClick={() => onSelectNote(path)}
                                style={{
                                    padding: '2px 0',
                                    fontSize: '0.9em',
                                    cursor: 'pointer',
                                    color: 'var(--ln-fg)',
                                    opacity: 0.9,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}
                                title={path}
                            >
                                {name}
                            </div>
                        );
                    })}
                    {notes.length === 0 && (
                        <div style={{ padding: '2px 0', fontSize: '0.8em', color: 'var(--ln-muted)', fontStyle: 'italic' }}>
                            No notes
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
