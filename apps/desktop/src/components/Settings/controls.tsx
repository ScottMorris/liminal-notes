import React, { useState, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { SettingControlDef, SettingOption } from './types';
import { ChevronDownIcon } from '../Icons';

function useSettingValue<T = any>(key?: string) {
    const { settings, updateSetting } = useSettings();
    const val = key ? (settings[key] as T) : undefined;
    const setVal = (v: T) => {
        if (key) updateSetting(key, v);
    };
    return [val, setVal] as const;
}

export const ToggleSwitch: React.FC<{ def: SettingControlDef }> = ({ def }) => {
    const [value, setValue] = useSettingValue<boolean>(def.key);

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
    const [value, setValue] = useSettingValue<string>(def.key);

    const getFirstValue = () => {
        if (!def.options || def.options.length === 0) return "";
        const first = def.options[0];
        if ('options' in first) { // It's a group
            return first.options[0]?.value ?? "";
        }
        return (first as SettingOption).value;
    };

    const current = value ?? getFirstValue();

    const renderOptions = () => {
        return def.options?.map((opt, idx) => {
            if ('options' in opt) {
                // Group
                return (
                    <optgroup key={idx} label={opt.label}>
                        {opt.options.map(subOpt => (
                             <option key={subOpt.value} value={subOpt.value}>{subOpt.label}</option>
                        ))}
                    </optgroup>
                );
            } else {
                // Option
                return <option key={opt.value} value={opt.value}>{opt.label}</option>;
            }
        });
    };

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
                    minWidth: '100px',
                    outlineColor: 'var(--ln-accent)'
                }}
            >
                {renderOptions()}
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
    const [value, setValue] = useSettingValue<number>(def.key);
    const val = value ?? def.min ?? 0;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
                type="range"
                min={def.min}
                max={def.max}
                step={def.step}
                value={val}
                onChange={(e) => setValue(parseFloat(e.target.value))}
                style={{ width: '120px', accentColor: 'var(--ln-accent)' }}
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
    const [value] = useSettingValue(def.key);
    const display = value !== undefined ? String(value) : (def.label || "");

    return (
        <span style={{ color: 'var(--ln-muted)', fontSize: '0.9rem' }}>
            {display}
        </span>
    );
};
