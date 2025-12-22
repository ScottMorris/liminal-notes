import React, { useState, useMemo, useEffect } from 'react';
import { SettingControlDef } from './types';
import { usePluginHost } from '../../plugins/PluginHostProvider';
import { builtInPlugins } from '../../plugins/registry';
import { commandRegistry } from '../../commands/CommandRegistry';
import { XMarkIcon } from '../Icons';

export const CollectionList: React.FC<{ def: SettingControlDef }> = ({ def }) => {
    if (def.collectionId === 'core-plugins') return <PluginsCollection />;
    if (def.collectionId === 'hotkeys') return <HotkeysCollection />;
    if (def.collectionId === 'personal-dictionary') return <DictionaryCollection />;
    return null;
};

const PluginsCollection = () => {
    const { enabledPlugins, setPluginEnabled } = usePluginHost();
    const [filter, setFilter] = useState("");

    const filtered = useMemo(() => builtInPlugins.filter(p =>
        p.meta.name.toLowerCase().includes(filter.toLowerCase()) ||
        (p.meta.description && p.meta.description.toLowerCase().includes(filter.toLowerCase()))
    ), [filter]);

    return (
        <div style={{ width: '100%' }}>
            <div style={{ marginBottom: '15px' }}>
                <input
                    type="text"
                    placeholder="Search plugins..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--ln-bg)',
                        border: '1px solid var(--ln-border)',
                        color: 'var(--ln-fg)',
                        borderRadius: '4px'
                    }}
                />
            </div>
            {filtered.map(p => {
                const isEnabled = enabledPlugins.has(p.meta.id);
                return (
                    <div key={p.meta.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--ln-border)' }}>
                        <div style={{ flex: 1, paddingRight: '10px' }}>
                            <div style={{ fontWeight: 'bold' }}>{p.meta.name}</div>
                            {p.meta.description && (
                                <div style={{ fontSize: '0.85rem', color: 'var(--ln-muted)' }}>{p.meta.description}</div>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={isEnabled}
                                    onChange={(e) => setPluginEnabled(p.meta.id, e.target.checked)}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const DictionaryCollection = () => {
    // This is a special collection that manages the personal dictionary file directly
    // OR we manage it via a new hook/context.
    // For now, let's load/save using the file system directly via IPC or a helper.
    // But we need to use a hook to get the state.

    // We will use spellcheckCore to get the 'ignored words' list,
    // BUT 'personal dictionary' is different from 'session ignored words'.
    // The requirements say: "Personal dictionary: Add/remove words UI".
    // And "Storage: per-vault".

    // I need a way to READ the current personal dictionary.
    // I haven't implemented the persistence loading logic yet.
    // I should put that logic in `spellcheckCore` or a react hook.

    // Let's assume `useSpellcheck` hook exists or we create one here.
    // For now, I'll implement state here and wire it up.

    const [words, setWords] = useState<string[]>([]);
    const [newWord, setNewWord] = useState("");

    // Load words on mount
    useEffect(() => {
        // Need to load from file.
        // I will trigger a custom event 'liminal-spellcheck-load' or similar if I don't have direct access?
        // Actually, I can use `spellcheckCore` to store the dictionary if I add methods there.
        // Let's rely on `spellcheckCore` having the source of truth if possible,
        // OR we just read the file here.

        // I'll dispatch a custom event to request dictionary load or just read it if I have `readNote`.
        // I can import `readNote` from `../../ipc`.
        // But `readNote` is async.

        loadDictionary();
    }, []);

    const loadDictionary = async () => {
        // We need to know where the dictionary is.
        // .liminal/spellcheck/personal-en-CA.txt
        try {
            const { desktopVault } = await import('../../adapters/DesktopVaultAdapter');
            // Try to read it.
            // Note: readNote might fail if file doesn't exist.
            try {
                const { content } = await desktopVault.readNote('.liminal/spellcheck/personal-en-CA.txt');
                const list = content.split('\n').map((w: string) => w.trim()).filter((w: string) => w.length > 0);
                setWords(list.sort());
            } catch (e) {
                // File likely doesn't exist, start empty
                setWords([]);
            }
        } catch (e) {
            console.error("Failed to load dictionary", e);
        }
    };

    const saveDictionary = async (newWords: string[]) => {
        try {
            const { desktopVault } = await import('../../adapters/DesktopVaultAdapter');
            const content = newWords.join('\n');
            await desktopVault.writeNote('.liminal/spellcheck/personal-en-CA.txt', content);
            setWords(newWords);

            // Also notify spellcheckCore to update runtime
            // We need to re-initialize the dictionary or add words.
            // spellcheckCore should expose a 'setPersonalWords' or similar.
            // For now, assume we reload the app or trigger a re-check.
            // Ideally, we add the new words to the runtime spellchecker too.
             window.dispatchEvent(new CustomEvent('liminal-spellcheck-update', { detail: { words: newWords } }));

        } catch (e) {
            console.error("Failed to save dictionary", e);
        }
    };

    const handleAdd = async () => {
        if (!newWord.trim()) return;
        const word = newWord.trim();
        if (words.includes(word)) return;

        const updated = [...words, word].sort();
        await saveDictionary(updated);
        setNewWord("");
    };

    const handleDelete = async (word: string) => {
        const updated = words.filter(w => w !== word);
        await saveDictionary(updated);
    };

    return (
        <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <input
                    type="text"
                    placeholder="Add word..."
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    style={{
                        flex: 1,
                        padding: '8px',
                        background: 'var(--ln-bg)',
                        border: '1px solid var(--ln-border)',
                        color: 'var(--ln-fg)',
                        borderRadius: '4px'
                    }}
                />
                <button
                    onClick={handleAdd}
                    style={{
                        padding: '8px 16px',
                        background: 'var(--ln-accent)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Add
                </button>
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--ln-border)', borderRadius: '4px' }}>
                {words.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ln-muted)' }}>
                        Dictionary is empty.
                    </div>
                )}
                {words.map(word => (
                    <div key={word} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--ln-border)',
                        background: 'var(--ln-bg)'
                    }}>
                        <span>{word}</span>
                        <button
                            onClick={() => handleDelete(word)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--ln-muted)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            title="Remove word"
                        >
                            <XMarkIcon size={16} />
                        </button>
                    </div>
                ))}
            </div>
             <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--ln-muted)' }}>
                {words.length} words in personal dictionary.
            </div>
        </div>
    );
};

const HotkeysCollection = () => {
    const [filter, setFilter] = useState("");
    const commands = commandRegistry.getAllCommands();

    const filtered = useMemo(() => commands.filter(c =>
        c.label.toLowerCase().includes(filter.toLowerCase()) ||
        (c.shortcut && c.shortcut.toLowerCase().includes(filter.toLowerCase()))
    ), [filter, commands]);

    return (
        <div style={{ width: '100%' }}>
            <div style={{ marginBottom: '15px' }}>
                <input
                    type="text"
                    placeholder="Search hotkeys..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '8px',
                        background: 'var(--ln-bg)',
                        border: '1px solid var(--ln-border)',
                        color: 'var(--ln-fg)',
                        borderRadius: '4px'
                    }}
                />
            </div>
            {filtered.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--ln-border)' }}>
                    <div>
                        <div style={{ fontWeight: '500' }}>{c.label}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--ln-muted)' }}>{c.id}</div>
                    </div>
                    <div>
                        {c.shortcut ? (
                            <kbd style={{
                                fontFamily: 'monospace',
                                background: 'var(--ln-sidebar-bg)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: '1px solid var(--ln-border)',
                                fontSize: '0.85em'
                            }}>
                                {c.shortcut}
                            </kbd>
                        ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--ln-muted)', fontStyle: 'italic' }}>-</span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};
