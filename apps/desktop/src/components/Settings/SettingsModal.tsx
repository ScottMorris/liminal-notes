import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import { useSettings } from '../../contexts/SettingsContext';
import { getSections } from './schemas';
import { SettingsSection } from './SettingsRenderer';
import { XMarkIcon } from '../Icons';
import pkg from '../../../package.json';
import { RemindersDebugModal } from '../../features/reminders/components/RemindersDebugModal';
import { TagSettings } from './TagSettings';
import { useTts } from '../../plugins/core.tts/useTts';

interface SettingsModalProps {
    onClose: () => void;
    onResetVault: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onResetVault }) => {
    const { availableThemes } = useTheme();
    const { settings } = useSettings();
    const { speak } = useTts();
    const appVersion = pkg.version;

    const sections = useMemo(() => getSections(availableThemes, appVersion), [availableThemes, appVersion]);

    const tagSection = { id: 'tags', title: 'Tag Management', settings: [], groups: [] };

    // Group sections for sidebar
    const optionsGroups = [
        ...sections.filter(s => ['general', 'vault', 'editor', 'files-links'].includes(s.id)),
        tagSection,
        ...sections.filter(s => ['appearance', 'hotkeys'].includes(s.id))
    ];
    const pluginsGroups = sections.filter(s => ['core-plugins', 'read-aloud', 'community-plugins'].includes(s.id));

    const [activeSectionId, setActiveSectionId] = useState(optionsGroups[0]?.id || sections[0]?.id);
    const [isDebugOpen, setIsDebugOpen] = useState(false);

    const activeSection = sections.find(s => s.id === activeSectionId) || (activeSectionId === 'tags' ? tagSection : undefined);

    const handleAction = (actionId: string) => {
        if (actionId === 'switch-vault') {
            if (window.confirm("Are you sure you want to switch vaults?")) {
                onResetVault();
            }
        } else if (actionId === 'tts-preview') {
            const voice = (settings['tts.defaultVoice'] as string) || 'af_sky';
            const speed = (settings['tts.defaultSpeed'] as number) || 1.0;
            speak("This is a preview of the selected voice.", voice, speed);
        }
    };

    // Close on Esc
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content settings-modal"
                onClick={e => e.stopPropagation()}
                style={{
                    width: '900px',
                    height: '80vh',
                    display: 'flex',
                    flexDirection: 'row',
                    padding: 0,
                    overflow: 'hidden',
                    maxWidth: '95vw',
                    maxHeight: '90vh'
                }}
            >
                {/* Sidebar */}
                <div className="settings-sidebar" style={{
                    width: '250px',
                    minWidth: '250px',
                    background: 'var(--ln-sidebar-bg)',
                    borderRight: '1px solid var(--ln-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto'
                }}>
                    <div className="settings-sidebar-content" style={{ padding: '20px 0' }}>
                        <div className="sidebar-group">
                            <div className="sidebar-group-header" style={{
                                padding: '5px 20px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                color: 'var(--ln-muted)',
                                textTransform: 'uppercase'
                            }}>
                                Options
                            </div>
                            {optionsGroups.map(section => (
                                <div
                                    key={section.id}
                                    className={`sidebar-item ${activeSectionId === section.id ? 'active' : ''}`}
                                    onClick={() => setActiveSectionId(section.id)}
                                    style={{
                                        padding: '8px 20px',
                                        cursor: 'pointer',
                                        backgroundColor: activeSectionId === section.id ? 'var(--ln-item-hover-bg)' : 'transparent',
                                        borderLeft: activeSectionId === section.id ? '3px solid var(--ln-accent)' : '3px solid transparent',
                                        color: activeSectionId === section.id ? 'var(--ln-fg)' : 'var(--ln-sidebar-fg)'
                                    }}
                                >
                                    {section.title}
                                </div>
                            ))}
                        </div>

                        {pluginsGroups.length > 0 && (
                            <div className="sidebar-group" style={{ marginTop: '20px' }}>
                                <div className="sidebar-group-header" style={{
                                    padding: '5px 20px',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold',
                                    color: 'var(--ln-muted)',
                                    textTransform: 'uppercase'
                                }}>
                                    Core plugins
                                </div>
                                {pluginsGroups.map(section => (
                                    <div
                                        key={section.id}
                                        className={`sidebar-item ${activeSectionId === section.id ? 'active' : ''}`}
                                        onClick={() => setActiveSectionId(section.id)}
                                        style={{
                                            padding: '8px 20px',
                                            cursor: 'pointer',
                                            backgroundColor: activeSectionId === section.id ? 'var(--ln-item-hover-bg)' : 'transparent',
                                            borderLeft: activeSectionId === section.id ? '3px solid var(--ln-accent)' : '3px solid transparent',
                                            color: activeSectionId === section.id ? 'var(--ln-fg)' : 'var(--ln-sidebar-fg)'
                                        }}
                                    >
                                        {section.title}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="sidebar-group" style={{ marginTop: '20px' }}>
                            <div className="sidebar-group-header" style={{
                                padding: '5px 20px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                color: 'var(--ln-muted)',
                                textTransform: 'uppercase'
                            }}>
                                Developer
                            </div>
                            <div
                                className="sidebar-item"
                                onClick={() => setIsDebugOpen(true)}
                                style={{
                                    padding: '8px 20px',
                                    cursor: 'pointer',
                                    color: 'var(--ln-sidebar-fg)'
                                }}
                            >
                                Reminders Debug
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="settings-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    <div className="settings-header" style={{
                        padding: '20px',
                        borderBottom: '1px solid var(--ln-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexShrink: 0
                    }}>
                        <h2 style={{ margin: 0 }}>{activeSection?.title}</h2>
                        <button className="close-btn" onClick={onClose}><XMarkIcon size={24} /></button>
                    </div>
                    <div className="settings-scroll-area" style={{ flex: 1, overflowY: 'auto', padding: '20px 40px' }}>
                        {activeSectionId === 'tags' ? (
                            <TagSettings />
                        ) : activeSection && (
                            <SettingsSection section={activeSection} onAction={handleAction} />
                        )}
                    </div>
                </div>
            </div>
            {isDebugOpen && <RemindersDebugModal onClose={() => setIsDebugOpen(false)} />}
        </div>
    );
};
