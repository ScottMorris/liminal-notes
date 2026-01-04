import { themes } from '@liminal-notes/core-shared/theme';

export type SettingKind =
  | 'boolean'
  | 'select'
  | 'slider'
  | 'action'
  | 'computed' // read-only value
  | 'collection'; // not fully implemented yet

export interface SettingOption {
  value: string;
  label: string;
}

export interface SettingControlDef {
  key?: string; // Dot notation path to setting in SettingsState
  kind: SettingKind;
  label?: string;
  options?: SettingOption[];
  min?: number;
  max?: number;
  step?: number;
  actionId?: string;
  renderValue?: (val: any) => string;
  intent?: 'normal' | 'danger';
}

export interface SettingRowDef {
  id: string;
  label: string;
  description?: string;
  controls: SettingControlDef[];
}

export interface SettingsGroupDef {
  id: string;
  title?: string;
  rows: SettingRowDef[];
}

export interface SettingsSectionDef {
  id: string;
  title: string;
  groups: SettingsGroupDef[];
}

export const getSections = (appVersion: string, vaultName: string): SettingsSectionDef[] => {
    // Flatten themes for mobile select
    const themeOptions = [
        { value: 'system', label: 'System' },
        ...Object.values(themes).map(t => ({ value: t.id, label: t.name }))
    ];

    return [
    {
        id: 'general',
        title: 'General',
        groups: [
            {
                id: 'about',
                rows: [
                    {
                        id: 'version',
                        label: 'Current Version',
                        controls: [{ kind: 'computed', label: appVersion }]
                    }
                ]
            }
        ]
    },
    {
        id: 'vault',
        title: 'Vault',
        groups: [
            {
                id: 'vault-actions',
                rows: [
                    {
                        id: 'current-vault',
                        label: 'Current Vault',
                        controls: [{ kind: 'computed', label: vaultName }]
                    },
                    {
                        id: 'switch-vault',
                        label: 'Switch Vault',
                        description: 'Close current vault and open another one.',
                        controls: [{ kind: 'action', label: 'Switch', actionId: 'switch-vault' }]
                    }
                ]
            }
        ]
    },
    {
        id: 'editor',
        title: 'Editor',
        groups: [
            {
                id: 'behaviour',
                title: 'Behaviour',
                rows: [
                    {
                        id: 'focus-new-tabs',
                        label: 'Always focus new tabs',
                        controls: [{ kind: 'boolean', key: 'editor.focusNewTabs' }]
                    },
                    {
                        id: 'default-mode',
                        label: 'Default Editing Mode',
                        controls: [{
                            kind: 'select',
                            key: 'editor.defaultMode',
                            options: [
                                { value: 'source', label: 'Source Mode' },
                                { value: 'preview', label: 'Preview Mode' } // Preview might not be fully supported on mobile yet? Assuming source for now but keeping schema.
                            ]
                        }]
                    },
                     {
                        id: 'show-line-numbers',
                        label: 'Show line numbers',
                        controls: [{ kind: 'boolean', key: 'editor.showLineNumbers' }]
                    },
                    {
                        id: 'readable-line-length',
                        label: 'Readable line length',
                        controls: [{ kind: 'boolean', key: 'editor.readableLineLength' }]
                    },
                    // Word wrap is usually always on for mobile, but let's expose it
                    {
                        id: 'word-wrap',
                        label: 'Word wrap',
                        controls: [{ kind: 'boolean', key: 'editor.wordWrap' }]
                    }
                ]
            }
        ]
    },
    {
        id: 'appearance',
        title: 'Appearance',
        groups: [
            {
                id: 'theme',
                rows: [
                    {
                        id: 'base-theme',
                        label: 'Colour scheme',
                        controls: [{
                            kind: 'select',
                            key: 'appearance.theme',
                            options: themeOptions
                        }]
                    },
                    {
                        id: 'font-size',
                        label: 'Font size',
                        controls: [{ kind: 'slider', key: 'appearance.fontSize', min: 10, max: 30, step: 1 }]
                    },
                    {
                        id: 'time-format',
                        label: 'Time Format',
                        controls: [{
                            kind: 'select',
                            key: 'appearance.timeFormat',
                            options: [
                                { value: 'system', label: 'System Default' },
                                { value: '12h', label: '12-hour' },
                                { value: '24h', label: '24-hour' }
                            ]
                        }]
                    }
                ]
            }
        ]
    },
    {
        id: 'core-plugins',
        title: 'Core plugins',
        groups: [
            {
                id: 'plugins-list',
                rows: [
                    // MVP: Just a placeholder or read-only list.
                    // Since we don't have a dynamic list generator in this schema function yet,
                    // we'll rely on the Screen implementation to possibly inject rows or handle this section specially.
                    // For schema parity, we can define an info row.
                    {
                        id: 'plugins-info',
                        label: 'Core Plugins',
                        description: 'Plugin management is coming soon.',
                        controls: [{ kind: 'computed', label: 'View Only' }]
                    }
                ]
            }
        ]
    }
];
};
