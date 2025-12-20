import { useState, useRef, useEffect, useMemo } from 'react';
import { useTags } from '../../../contexts/TagsContext';
import { usePluginHost } from '../../../plugins/PluginHostProvider';
import { TagId } from '../../../types/tags';
import { normalizeTagId } from '../../../utils/tags';
import { suggestTags } from '../../../features/ai/tagSuggestions';

interface AddTagPopoverProps {
    assignedTags: TagId[];
    onAdd: (tagId: TagId) => void;
    onClose: () => void;
    noteTitle: string;
    noteContent: string;
}

export function AddTagPopover({ assignedTags, onAdd, onClose, noteTitle, noteContent }: AddTagPopoverProps) {
    const { tags, addTag } = useTags();
    const { enabledPlugins } = usePluginHost();
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // AI State
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [isLoadingAi, setIsLoadingAi] = useState(false);

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();

        // Trigger AI suggestions if enabled
        if (enabledPlugins.has('ai-assistant')) {
            setIsLoadingAi(true);
            suggestTags(noteTitle, noteContent)
                .then(setAiSuggestions)
                .catch(err => console.error("AI Tag Suggestion failed", err))
                .finally(() => setIsLoadingAi(false));
        }
    }, [enabledPlugins, noteTitle, noteContent]);

    const filteredTags = useMemo(() => {
        const query = normalizeTagId(input);
        const assignedSet = new Set(assignedTags);

        return Object.values(tags)
            .filter(t => !assignedSet.has(t.id))
            .filter(t => t.id.includes(query) || t.displayName.toLowerCase().includes(input.toLowerCase()))
            .slice(0, 10);
    }, [tags, input, assignedTags]);

    const handleKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const normalized = normalizeTagId(input);

            // Prefer exact match or new tag if input is typed
            if (normalized) {
                 await addTag(input);
                 onAdd(normalized);
                 onClose();
                 return;
            }

            // Otherwise use top suggestion
            if (filteredTags.length > 0) {
                 onAdd(filteredTags[0].id);
                 onClose();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <div className="popover add-tag-popover" style={{
            position: 'absolute',
            zIndex: 100,
            background: 'var(--ln-menu-bg)',
            border: '1px solid var(--ln-border)',
            borderRadius: '6px',
            padding: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            width: '250px',
            top: '100%',
            left: '0',
            color: 'var(--ln-fg)'
        }} onClick={(e) => e.stopPropagation()}>
            <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type to add..."
                className="form-input"
                style={{ width: '100%', marginBottom: '8px', padding: '4px' }}
            />

            <div className="suggestions-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {filteredTags.map(tag => (
                    <div
                        key={tag.id}
                        onClick={() => { onAdd(tag.id); onClose(); }}
                        style={{
                            padding: '4px 8px',
                            cursor: 'pointer',
                            borderRadius: '4px'
                        }}
                        className="suggestion-item"
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ln-hover-bg)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        {tag.displayName}
                    </div>
                ))}

                {input.trim() !== '' && filteredTags.length === 0 && (
                     <div style={{ fontSize: '0.9em', padding: '4px 8px', fontStyle: 'italic', color: 'var(--ln-muted)' }}>
                        Create "{input}"
                     </div>
                )}

                {enabledPlugins.has('ai-assistant') && (
                    <div className="ai-section" style={{ marginTop: '8px', borderTop: '1px solid var(--ln-border)', paddingTop: '4px' }}>
                        <div style={{ fontSize: '0.8em', color: 'var(--ln-accent)', marginBottom: '4px', fontWeight: 'bold' }}>Suggested by AI</div>
                        {isLoadingAi ? (
                            <div style={{ fontSize: '0.8em', color: 'var(--ln-muted)', fontStyle: 'italic', padding: '4px 8px' }}>Thinking...</div>
                        ) : (
                            aiSuggestions.map(tag => (
                                <div
                                    key={tag}
                                    onClick={async () => { await addTag(tag); onAdd(tag); onClose(); }}
                                    style={{ padding: '4px 8px', cursor: 'pointer', borderRadius: '4px' }}
                                    className="suggestion-item"
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ln-hover-bg)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    ✨ {tag}
                                </div>
                            ))
                        )}
                        {aiSuggestions.length === 0 && !isLoadingAi && (
                            <div style={{ fontSize: '0.8em', color: 'var(--ln-muted)', padding: '4px 8px' }}>No suggestions</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
