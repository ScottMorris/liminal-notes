import React, { useState, useMemo } from 'react';
import { SettingControlDef } from './types';
import { usePluginHost } from '../../plugins/PluginHostProvider';
import { builtInPlugins } from '../../plugins/registry';
import { commandRegistry } from '../../commands/CommandRegistry';

export const CollectionList: React.FC<{ def: SettingControlDef }> = ({ def }) => {
    if (def.collectionId === 'core-plugins') return <PluginsCollection />;
    if (def.collectionId === 'hotkeys') return <HotkeysCollection />;
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
