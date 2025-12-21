import React, { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WindowMinimizeIcon, WindowMaximizeIcon, WindowCloseIcon, WindowRestoreIcon } from './Icons';
import './TitleBar.css';

export const TitleBar: React.FC = () => {
    const [platform, setPlatform] = useState<'mac' | 'linux' | 'win'>('win');
    const [isMaximized, setIsMaximized] = useState(false);
    const appWindow = getCurrentWindow();

    useEffect(() => {
        const ua = navigator.userAgent;
        if (ua.includes('Mac')) {
            setPlatform('mac');
        } else if (ua.includes('Linux')) {
            setPlatform('linux');
        } else {
            setPlatform('win');
        }

        const updateState = async () => {
             try {
                setIsMaximized(await appWindow.isMaximized());
             } catch (e) {
                 console.error("Failed to check maximized state", e);
             }
        };

        updateState();

        const unlistenPromise = appWindow.listen('tauri://resize', updateState);

        return () => {
             unlistenPromise.then(unlisten => unlisten());
        };
    }, []);

    const minimize = () => appWindow.minimize();
    const toggleMaximize = async () => {
        await appWindow.toggleMaximize();
        setIsMaximized(await appWindow.isMaximized());
    };
    const close = () => appWindow.close();

    // Mac Traffic Lights
    const MacControls = () => (
        <div className="window-controls mac">
            <button onClick={close} className="control-button mac-close" title="Close" />
            <button onClick={minimize} className="control-button mac-minimize" title="Minimize" />
            <button onClick={toggleMaximize} className="control-button mac-maximize" title="Maximize" />
        </div>
    );

    // Windows Controls
    const WinControls = () => (
        <div className="window-controls win">
            <button onClick={minimize} className="control-button win-minimize" title="Minimize">
                <WindowMinimizeIcon />
            </button>
            <button onClick={toggleMaximize} className="control-button win-maximize" title={isMaximized ? "Restore" : "Maximize"}>
                {isMaximized ? <WindowRestoreIcon /> : <WindowMaximizeIcon />}
            </button>
            <button onClick={close} className="control-button win-close" title="Close">
                <WindowCloseIcon />
            </button>
        </div>
    );

    // Linux Controls (Distinct style)
    // TODO: Future enhancement: Track native GTK headerbar support for better system integration
    const LinuxControls = () => (
        <div className="window-controls linux">
            <button onClick={minimize} className="control-button linux-minimize" title="Minimize">
                <WindowMinimizeIcon />
            </button>
            <button onClick={toggleMaximize} className="control-button linux-maximize" title={isMaximized ? "Restore" : "Maximize"}>
                 {isMaximized ? <WindowRestoreIcon /> : <WindowMaximizeIcon />}
            </button>
            <button onClick={close} className="control-button linux-close" title="Close">
                <WindowCloseIcon />
            </button>
        </div>
    );

    return (
        <div className={`title-bar is-${platform}`}>
            {platform === 'mac' && (
                <>
                    <MacControls />
                    <div className="title-drag-region" data-tauri-drag-region />
                    <div className="app-title" data-tauri-drag-region>Liminal Notes</div>
                    <div className="title-drag-region" data-tauri-drag-region />
                    <div className="window-controls-placeholder" />
                </>
            )}

            {platform === 'linux' && (
                <>
                     <div className="window-controls-placeholder" />
                     <div className="title-drag-region" data-tauri-drag-region />
                     <div className="app-title" data-tauri-drag-region>Liminal Notes</div>
                     <div className="title-drag-region" data-tauri-drag-region />
                     <LinuxControls />
                </>
            )}

            {platform === 'win' && (
                <>
                     <div className="app-title left" data-tauri-drag-region>Liminal Notes</div>
                     <div className="title-drag-region" data-tauri-drag-region />
                     <WinControls />
                </>
            )}
        </div>
    );
};
