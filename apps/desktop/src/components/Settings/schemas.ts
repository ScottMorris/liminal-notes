import { SettingsSectionDef } from './types';
import { Theme } from '../../theme/types';

export const getSections = (
    availableThemes: Theme[],
    appVersion: string
): SettingsSectionDef[] => {
    // Sort themes: System, then Light themes, then Dark themes
    const lightThemes = availableThemes
        .filter(t => t.category === 'light')
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(t => ({ value: t.id, label: t.name }));

    const darkThemes = availableThemes
        .filter(t => t.category === 'dark')
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(t => ({ value: t.id, label: t.name }));

    // Using optgroup structure for clearer UI
    const themeOptions = [
        { value: 'system', label: 'System' },
        {
            label: 'Light Themes',
            options: lightThemes
        },
        {
            label: 'Dark Themes',
            options: darkThemes
        }
    ];

    const voiceOptions = [
        { value: 'af_sky', label: 'Sky (American Female)' },
        { value: 'af_bella', label: 'Bella (American Female)' },
        { value: 'af_nicole', label: 'Nicole (American Female)' },
        { value: 'af_sarah', label: 'Sarah (American Female)' },
        { value: 'am_adam', label: 'Adam (American Male)' },
        { value: 'am_michael', label: 'Michael (American Male)' },
        { value: 'bf_emma', label: 'Emma (British Female)' },
        { value: 'bf_isabella', label: 'Isabella (British Female)' },
        { value: 'bm_george', label: 'George (British Male)' },
        { value: 'bm_lewis', label: 'Lewis (British Male)' },
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
                    },
                    {
                        id: 'word-wrap',
                        label: 'Word wrap',
                        description: 'Wrap long lines to fit the window.',
                        controls: [{ kind: 'boolean', key: 'editor.wordWrap' }]
                    }
                ]
            },
            {
                id: 'spellcheck',
                title: 'Spellcheck',
                rows: [
                    {
                        id: 'spellcheck-enabled',
                        label: 'Enable spellcheck',
                        controls: [{ kind: 'boolean', key: 'editor.spellcheck.enabled' }]
                    },
                    {
                        id: 'spellcheck-language',
                        label: 'Language',
                        controls: [{
                            kind: 'select',
                            key: 'editor.spellcheck.language',
                            options: [
                                { value: 'en-CA', label: 'English (Canada)' }
                            ]
                        }]
                    },
                    {
                        id: 'spellcheck-dictionary',
                        label: 'Personal Dictionary',
                        description: 'Manage words added to your dictionary.',
                        controls: [{ kind: 'collection', collectionId: 'personal-dictionary' }]
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
                        label: 'Base colour scheme',
                        controls: [{
                            kind: 'select',
                            key: 'appearance.theme',
                            options: themeOptions
                        }]
                    },
                    {
                        id: 'system-accent',
                        label: 'Use system accent color',
                        description: 'Sync the accent color with your desktop environment (Linux only).',
                        controls: [{ kind: 'boolean', key: 'appearance.useSystemAccent' }]
                    },
                    {
                        id: 'native-decorations',
                        label: 'Use native window decorations',
                        description: 'Use the system default window borders instead of the custom title bar.',
                        controls: [{ kind: 'boolean', key: 'appearance.useNativeDecorations' }]
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
                    {
                        id: 'plugins-collection',
                        label: '',
                        controls: [{ kind: 'collection', collectionId: 'core-plugins' }]
                    }
                ]
            }
        ]
    },
    {
        id: 'read-aloud',
        title: 'Read Aloud',
        groups: [
            {
                id: 'tts-settings',
                rows: [
                    {
                        id: 'tts-voice',
                        label: 'Default Voice',
                        controls: [{
                            kind: 'select',
                            key: 'tts.defaultVoice',
                            options: voiceOptions
                        }]
                    },
                    {
                        id: 'tts-speed',
                        label: 'Default Speed',
                        controls: [{
                            kind: 'slider',
                            key: 'tts.defaultSpeed',
                            min: 0.5,
                            max: 2.0,
                            step: 0.1
                        }]
                    },
                    {
                        id: 'tts-preview',
                        label: 'Voice Preview',
                        description: 'Play a short sample of the selected voice.',
                        controls: [{ kind: 'action', label: 'Play Sample', actionId: 'tts-preview' }]
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
};
