import React, { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WindowMinimizeIcon, WindowMaximizeIcon, WindowCloseIcon, WindowRestoreIcon } from './Icons';
import { ContextMenu } from './Editor/ContextMenu/ContextMenu';
import { MenuModel } from './Editor/ContextMenu/types';
import './TitleBar.css';

export const TitleBar: React.FC = () => {
    const [platform, setPlatform] = useState<'mac' | 'linux' | 'win'>('win');
    const [isMaximized, setIsMaximized] = useState(false);
    const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

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
                setIsAlwaysOnTop(await appWindow.isAlwaysOnTop());
             } catch (e) {
                 console.error("Failed to check window state", e);
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

    const handleContextMenu = async (e: React.MouseEvent) => {
        e.preventDefault();
        try {
            setIsMaximized(await appWindow.isMaximized());
            setIsAlwaysOnTop(await appWindow.isAlwaysOnTop());
        } catch(e) { console.error(e); }

        setMenuPosition({ x: e.clientX, y: e.clientY });
        setMenuOpen(true);
    };

    const handleMenuAction = async (itemId: string) => {
        switch (itemId) {
            case 'restore':
            case 'maximize':
                toggleMaximize();
                break;
            case 'minimize':
                minimize();
                break;
            case 'move':
                void appWindow.startDragging();
                break;
            case 'always-on-top':
                const newState = !isAlwaysOnTop;
                await appWindow.setAlwaysOnTop(newState);
                setIsAlwaysOnTop(newState);
                break;
            case 'close':
                close();
                break;
        }
        setMenuOpen(false);
    };

    const menuModel: MenuModel = {
        sections: [
            {
                items: [
                    {
                        id: isMaximized ? 'restore' : 'maximize',
                        label: isMaximized ? 'Restore' : 'Maximize',
                        icon: isMaximized ? 'WindowRestoreIcon' : 'WindowMaximizeIcon'
                    },
                    {
                        id: 'minimize',
                        label: 'Minimize',
                        icon: 'WindowMinimizeIcon'
                    }
                ]
            },
            { items: [{ id: 'move', label: 'Move', icon: 'MoveIcon' }] },
            {
                items: [{
                    id: 'always-on-top',
                    label: 'Always on Top',
                    icon: isAlwaysOnTop ? 'CheckIcon' : undefined
                }]
            },
            {
                items: [{ id: 'close', label: 'Close', icon: 'WindowCloseIcon' }]
            }
        ]
    };

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
        <>
        <div className={`title-bar is-${platform}`} onContextMenu={handleContextMenu}>
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
        {menuOpen && (
            <ContextMenu
                model={menuModel}
                position={menuPosition}
                onClose={() => setMenuOpen(false)}
                onItemClick={handleMenuAction}
            />
        )}
        </>
    );
};
