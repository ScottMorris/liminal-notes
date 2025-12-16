import React, { useState, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { SettingControlDef } from './types';
import { ChevronDownIcon } from '../Icons';

function useSettingValue(key?: string) {
    const { settings, updateSetting } = useSettings();
    const val = key ? settings[key] : undefined;
    const setVal = (v: any) => {
        if (key) updateSetting(key, v);
    };
    return [val, setVal] as const;
}

export const ToggleSwitch: React.FC<{ def: SettingControlDef }> = ({ def }) => {
    const [value, setValue] = useSettingValue(def.key);
    const checked = value === true; // Strict check? or !!value

    return (
        <label className="toggle-switch" title={def.label}>
            <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => setValue(e.target.checked)}
            />
            <span className="slider"></span>
        </label>
    );
};

export const SelectDropdown: React.FC<{ def: SettingControlDef }> = ({ def }) => {
    const [value, setValue] = useSettingValue(def.key);
    // If value is undefined, use first option or empty
    const current = (value as string) ?? def.options?.[0]?.value ?? "";

    return (
        <div className="select-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
            <select
                value={current}
                onChange={(e) => setValue(e.target.value)}
                title={def.label}
                style={{
                    appearance: 'none',
                    padding: '6px 24px 6px 10px',
                    borderRadius: '4px',
                    border: '1px solid var(--ln-border)',
                    background: 'var(--ln-bg)',
                    color: 'var(--ln-fg)',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    minWidth: '100px'
                }}
            >
                {def.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            <div style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--ln-muted)' }}>
                <ChevronDownIcon size={14} />
            </div>
        </div>
    );
};

export const TextInput: React.FC<{ def: SettingControlDef }> = ({ def }) => {
    const [value, setValue] = useSettingValue(def.key);
    const [localValue, setLocalValue] = useState(value as string || "");

    useEffect(() => {
        setLocalValue(value as string || "");
    }, [value]);

    const handleBlur = () => {
        if (localValue !== value) {
            setValue(localValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur();
        }
    };

    return (
        <input
            type="text"
            value={localValue}
            placeholder={def.placeholder}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{
                background: 'var(--ln-bg)',
                border: '1px solid var(--ln-border)',
                color: 'var(--ln-fg)',
                padding: '5px 8px',
                borderRadius: '4px',
                textAlign: 'right',
                width: '200px'
            }}
        />
    );
};

export const NumberInput: React.FC<{ def: SettingControlDef }> = ({ def }) => {
    const [value, setValue] = useSettingValue(def.key);
    const [localValue, setLocalValue] = useState(value !== undefined ? String(value) : "");

    useEffect(() => {
        setLocalValue(value !== undefined ? String(value) : "");
    }, [value]);

    const commit = () => {
        const num = parseFloat(localValue);
        if (!isNaN(num)) {
            // Clamp
            let final = num;
            if (def.min !== undefined) final = Math.max(def.min, final);
            if (def.max !== undefined) final = Math.min(def.max, final);
            setValue(final);
            setLocalValue(String(final));
        } else {
             // Reset
             setLocalValue(value !== undefined ? String(value) : "");
        }
    };

    return (
        <input
            type="number"
            value={localValue}
            min={def.min}
            max={def.max}
            step={def.step}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
            style={{
                background: 'var(--ln-bg)',
                border: '1px solid var(--ln-border)',
                color: 'var(--ln-fg)',
                padding: '5px 8px',
                borderRadius: '4px',
                textAlign: 'right',
                width: '80px'
            }}
        />
    );
};

export const Slider: React.FC<{ def: SettingControlDef }> = ({ def }) => {
    const [value, setValue] = useSettingValue(def.key);
    const val = (value as number) ?? def.min ?? 0;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
                type="range"
                min={def.min}
                max={def.max}
                step={def.step}
                value={val}
                onChange={(e) => setValue(parseFloat(e.target.value))}
                style={{ width: '120px' }}
            />
            <span style={{ minWidth: '30px', textAlign: 'right', fontSize: '0.9rem' }}>{val}</span>
        </div>
    );
};

export const ActionButton: React.FC<{ def: SettingControlDef; onAction?: (id: string) => void }> = ({ def, onAction }) => {
    const handleClick = () => {
        if (def.actionId && onAction) {
            onAction(def.actionId);
        }
    };

    const isDanger = def.intent === 'danger';

    return (
        <button
            onClick={handleClick}
            style={{
                background: isDanger ? '#e74c3c' : 'var(--ln-bg)',
                color: isDanger ? 'white' : 'var(--ln-fg)',
                borderColor: isDanger ? '#c0392b' : 'var(--ln-border)',
            }}
        >
            {def.label || "Action"}
        </button>
    );
};

export const ComputedText: React.FC<{ def: SettingControlDef }> = ({ def }) => {
    // Value is passed in def.label usually for computed text, or we bind to a key?
    // Spec says "derived from setting value".
    // Or it might just be static text if the schema generator computed it.
    // If def.key is present, show that value.
    const [value] = useSettingValue(def.key);
    const display = value !== undefined ? String(value) : (def.label || "");

    return (
        <span style={{ color: 'var(--ln-muted)', fontSize: '0.9rem' }}>
            {display}
        </span>
    );
};
