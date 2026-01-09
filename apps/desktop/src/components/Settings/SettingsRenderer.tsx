import React from 'react';
import { SettingsSectionDef, SettingsGroupDef, SettingRowDef, SettingControlDef, SettingsActionHandler } from './types';
import { ToggleSwitch, SelectDropdown, TextInput, NumberInput, Slider, ActionButton, ComputedText, ProgressBar } from './controls';
import { CollectionList } from './CollectionList';

interface RendererProps {
    section: SettingsSectionDef;
    onAction: SettingsActionHandler;
}

export const SettingsSection: React.FC<RendererProps> = ({ section, onAction }) => {
    return (
        <div className="settings-section" style={{ paddingBottom: '50px' }}>
            {section.groups.map(group => (
                <SettingsGroup key={group.id} group={group} onAction={onAction} />
            ))}
        </div>
    );
};

const SettingsGroup: React.FC<{ group: SettingsGroupDef; onAction: SettingsActionHandler }> = ({ group, onAction }) => {
    return (
        <div className="settings-group" style={{ marginBottom: '30px' }}>
            {group.title && (
                <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', color: 'var(--ln-accent)' }}>{group.title}</h3>
            )}
            <div className="settings-rows">
                {group.rows.map(row => (
                    <SettingRow key={row.id} row={row} onAction={onAction} />
                ))}
            </div>
        </div>
    );
};

const SettingRow: React.FC<{ row: SettingRowDef; onAction: SettingsActionHandler }> = ({ row, onAction }) => {
    // Check if this is a full-width collection row
    const isCollection = row.controls.length === 1 && row.controls[0].kind === 'collection';

    if (isCollection) {
        return (
            <div className="setting-row" style={{ padding: '12px 0', borderBottom: '1px solid var(--ln-border)' }}>
                 <Control def={row.controls[0]} onAction={onAction} />
            </div>
        );
    }

    return (
        <div className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--ln-border)' }}>
            <div className="setting-info" style={{ flex: 1, paddingRight: '20px' }}>
                {row.label && <div className="setting-label" style={{ fontWeight: 500 }}>{row.label}</div>}
                {row.description && <div className="setting-desc" style={{ fontSize: '0.85rem', color: 'var(--ln-muted)', marginTop: '4px' }}>{row.description}</div>}
            </div>
            <div className="setting-controls" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {row.controls.map((control, idx) => (
                    <Control key={idx} def={control} onAction={onAction} />
                ))}
            </div>
        </div>
    );
};

const Control: React.FC<{ def: SettingControlDef; onAction: SettingsActionHandler }> = ({ def, onAction }) => {
    switch (def.kind) {
        case 'boolean': return <ToggleSwitch def={def} />;
        case 'select': return <SelectDropdown def={def} />;
        case 'string': return <TextInput def={def} />;
        case 'number': return <NumberInput def={def} />;
        case 'slider': return <Slider def={def} />;
        case 'action': return <ActionButton def={def} onAction={onAction} />;
        case 'computed': return <ComputedText def={def} />;
        case 'progress': return <ProgressBar def={def} />;
        case 'collection': return <CollectionList def={def} />;
        default: return null;
    }
};
