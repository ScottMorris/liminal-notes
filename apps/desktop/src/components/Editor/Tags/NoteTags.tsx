import { TagId } from '../../../types/tags';
import { useTags } from '../../../contexts/TagsContext';
import { XMarkIcon } from '../../Icons';

interface NoteTagsProps {
    tags: TagId[];
    onRemove: (tagId: TagId) => void;
    onAddClick: () => void;
}

export function NoteTags({ tags, onRemove, onAddClick }: NoteTagsProps) {
    const { tags: tagDefs } = useTags();

    return (
        <div className="note-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', marginLeft: '10px' }}>
            {tags.map(tagId => {
                const def = tagDefs[tagId];
                const displayName = def ? def.displayName : tagId;
                const color = def?.color || 'var(--ln-accent)';

                return (
                    <div
                        key={tagId}
                        className="tag-bubble"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            backgroundColor: color + '20', // Low opacity background
                            border: `1px solid ${color}`,
                            borderRadius: '12px',
                            padding: '1px 6px',
                            fontSize: '0.8em',
                            color: 'var(--ln-fg)',
                            cursor: 'pointer'
                        }}
                        onClick={(e) => { e.stopPropagation(); /* Open tag browser filter? Spec says yes. For now no-op */ }}
                    >
                        <span style={{ marginRight: '4px' }}>{displayName}</span>
                        <span
                            onClick={(e) => { e.stopPropagation(); onRemove(tagId); }}
                            className="tag-remove"
                            title="Remove tag"
                            style={{ display: 'flex', alignItems: 'center', opacity: 0.6 }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                        >
                            <XMarkIcon size={12} />
                        </span>
                    </div>
                );
            })}

            <button
                className="add-tag-btn"
                onClick={(e) => { e.stopPropagation(); onAddClick(); }}
                title="Add Tag"
                style={{
                    background: 'none',
                    border: '1px dashed var(--ln-muted)',
                    borderRadius: '12px',
                    padding: '1px 6px',
                    fontSize: '0.8em',
                    color: 'var(--ln-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    marginLeft: '4px'
                }}
            >
                {tags.length === 0 ? '+ Add tag' : '+'}
            </button>
        </div>
    );
}
