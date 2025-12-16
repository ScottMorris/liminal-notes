import { SettingsSectionDef } from './types';
import { Theme } from '../../theme';

export const getSections = (
    availableThemes: Theme[],
    appVersion: string
): SettingsSectionDef[] => [
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
                id: 'behavior',
                title: 'Behavior',
                rows: [
                    {
                        id: 'focus-new-tabs',
                        label: 'Always focus new tabs',
                        description: 'When you open a link in a new tab, switch to it immediately.',
                        controls: [{ kind: 'boolean', key: 'editor.focusNewTabs' }]
                    },
                     {
                        id: 'show-line-numbers',
                        label: 'Show line numbers',
                        description: 'Show line numbers in the gutter.',
                        controls: [{ kind: 'boolean', key: 'editor.showLineNumbers' }]
                    },
                    {
                        id: 'readable-line-length',
                        label: 'Readable line length',
                        description: 'Limit maximum line length.',
                        controls: [{ kind: 'boolean', key: 'editor.readableLineLength' }]
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
                        label: 'Base color scheme',
                        controls: [{
                            kind: 'select',
                            key: 'appearance.theme',
                            options: [
                                { value: 'system', label: 'System' },
                                ...availableThemes.map(t => ({ value: t.id, label: t.name }))
                            ]
                        }]
                    },
                    {
                        id: 'font-size',
                        label: 'Font size',
                        controls: [{ kind: 'slider', key: 'appearance.fontSize', min: 10, max: 30, step: 1 }]
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
                    {
                        id: 'plugins-collection',
                        label: '', // Hidden label
                        controls: [{ kind: 'collection', collectionId: 'core-plugins' }]
                    }
                ]
            }
        ]
    },
    {
        id: 'hotkeys',
        title: 'Hotkeys',
        groups: [
            {
                id: 'hotkeys-list',
                rows: [
                    {
                        id: 'hotkeys-collection',
                        label: '',
                        controls: [{ kind: 'collection', collectionId: 'hotkeys' }]
                    }
                ]
            }
        ]
    }
];
