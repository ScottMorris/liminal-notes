import React, { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WindowMinimizeIcon, WindowMaximizeIcon, WindowCloseIcon } from './Icons';
import './TitleBar.css';

export const TitleBar: React.FC = () => {
    const [isMac, setIsMac] = useState(false);

    useEffect(() => {
        // Simple heuristic for macOS
        setIsMac(navigator.userAgent.includes('Mac'));
    }, []);

    const appWindow = getCurrentWindow();

    const minimize = () => appWindow.minimize();
    const maximize = () => appWindow.toggleMaximize();
    const close = () => appWindow.close();

    // Mac Traffic Lights
    const MacControls = () => (
        <div className="window-controls mac">
            <button onClick={close} className="control-button mac-close" title="Close" />
            <button onClick={minimize} className="control-button mac-minimize" title="Minimize" />
            <button onClick={maximize} className="control-button mac-maximize" title="Maximize" />
        </div>
    );

    // Windows/Linux Controls
    const WinControls = () => (
        <div className="window-controls win">
            <button onClick={minimize} className="control-button win-minimize" title="Minimize">
                <WindowMinimizeIcon />
            </button>
            <button onClick={maximize} className="control-button win-maximize" title="Maximize">
                <WindowMaximizeIcon />
            </button>
            <button onClick={close} className="control-button win-close" title="Close">
                <WindowCloseIcon />
            </button>
        </div>
    );

    return (
        <div className={`title-bar ${isMac ? 'is-mac' : 'is-win'}`} data-tauri-drag-region>
            {isMac ? (
                <>
                    <MacControls />
                    <div className="title-drag-region" data-tauri-drag-region />
                    <div className="app-title" data-tauri-drag-region>Liminal Notes</div>
                    <div className="title-drag-region" data-tauri-drag-region />
                    <div className="window-controls-placeholder" /> {/* Balance for center alignment */}
                </>
            ) : (
                <>
                     <div className="app-title left" data-tauri-drag-region>Liminal Notes</div>
                     <div className="title-drag-region" data-tauri-drag-region />
                     <WinControls />
                </>
            )}
        </div>
    );
};
