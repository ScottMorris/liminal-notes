import React, { useEffect, useMemo, useState } from 'react';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { NumberInput } from './controls';
import { useSettings } from '../../contexts/SettingsContext';
import { useNotification } from '../NotificationContext';

type AspectRatioOption = {
    value: string;
    label: string;
    width?: number;
    height?: number;
};

const ASPECT_RATIOS: AspectRatioOption[] = [
    { value: 'free', label: 'Freeform (manual)' },
    { value: 'custom', label: 'Custom' },
    { value: '16:9', label: '16:9 (widescreen)', width: 16, height: 9 },
    { value: '4:3', label: '4:3 (classic)', width: 4, height: 3 },
    { value: '3:2', label: '3:2 (photo)', width: 3, height: 2 },
    { value: '1:1', label: '1:1 (square)', width: 1, height: 1 },
    { value: '21:9', label: '21:9 (ultrawide)', width: 21, height: 9 }
];

const MIN_WIDTH = 320;
const MIN_HEIGHT = 320;
const MAX_WIDTH = 4000;
const MAX_HEIGHT = 4000;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const parseNumericSetting = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
};

export const DeveloperWindowSettings: React.FC = () => {
    const { settings, updateSetting } = useSettings();
    const { notify } = useNotification();
    const [isApplying, setIsApplying] = useState(false);
    const [isInitialised, setIsInitialised] = useState(false);
    const [scaleFactor, setScaleFactor] = useState(1);
    const [currentSize, setCurrentSize] = useState<{ logical: { w: number; h: number }; physical: { w: number; h: number } } | null>(null);

    const storedWidth = settings['developer.window.width'];
    const storedHeight = settings['developer.window.height'];
    const storedAspect = settings['developer.window.aspectRatio'];
    const storedCustomWidth = settings['developer.window.customAspectWidth'];
    const storedCustomHeight = settings['developer.window.customAspectHeight'];

    const width = parseNumericSetting(storedWidth);
    const height = parseNumericSetting(storedHeight);
    const customAspectWidth = parseNumericSetting(storedCustomWidth);
    const customAspectHeight = parseNumericSetting(storedCustomHeight);
    const aspectRatio = typeof storedAspect === 'string' ? storedAspect : 'free';

    const syncFromWindow = async (writeSettings: boolean) => {
        const appWindow = getCurrentWindow();
        const [size, scale] = await Promise.all([
            appWindow.outerSize(),
            appWindow.scaleFactor().catch(() => 1)
        ]);
        const logicalWidth = Math.round(size.width / scale);
        const logicalHeight = Math.round(size.height / scale);

        setScaleFactor(scale);
        setCurrentSize({
            logical: { w: logicalWidth, h: logicalHeight },
            physical: { w: size.width, h: size.height }
        });

        if (writeSettings) {
            await updateSetting('developer.window.width', logicalWidth);
            await updateSetting('developer.window.height', logicalHeight);
        }

        return { logical: { w: logicalWidth, h: logicalHeight }, physical: { w: size.width, h: size.height }, scale };
    };

    useEffect(() => {
        if (isInitialised) return;

        const bootstrap = async () => {
            try {
                const details = await syncFromWindow(false);

                const logicalWidth = details.logical.w;
                const logicalHeight = details.logical.h;

                const looksLikePhysicalStored =
                    typeof width === 'number' &&
                    typeof height === 'number' &&
                    details.scale > 1 &&
                    Math.abs(width - details.physical.w) <= 5 &&
                    Math.abs(height - details.physical.h) <= 5;

                if (looksLikePhysicalStored) {
                    await updateSetting('developer.window.width', logicalWidth);
                    await updateSetting('developer.window.height', logicalHeight);
                }

                if (width === undefined) {
                    await updateSetting('developer.window.width', logicalWidth);
                }
                if (height === undefined) {
                    await updateSetting('developer.window.height', logicalHeight);
                }
                if (storedAspect === undefined) {
                    await updateSetting('developer.window.aspectRatio', 'free');
                }
            } catch (error) {
                console.error('Failed to seed window sizing settings', error);
            } finally {
                setIsInitialised(true);
            }
        };

        void bootstrap();
    }, [isInitialised, width, height, storedAspect, updateSetting]);

    const selectedRatio = useMemo(
        () => ASPECT_RATIOS.find(r => r.value === aspectRatio) ?? ASPECT_RATIOS[0],
        [aspectRatio]
    );

    const activeRatioValue = useMemo(() => {
        if (selectedRatio.value === 'custom' && customAspectWidth && customAspectHeight) {
            return customAspectWidth / customAspectHeight;
        }
        if (selectedRatio.width && selectedRatio.height && selectedRatio.value !== 'free') {
            return selectedRatio.width / selectedRatio.height;
        }
        return undefined;
    }, [customAspectHeight, customAspectWidth, selectedRatio]);

    const isWidthLocked = selectedRatio.value !== 'free' && !!activeRatioValue;

    useEffect(() => {
        if (!isInitialised) return;
        if (!height) return;
        if (!activeRatioValue) return;

        const recalculatedWidth = Math.round(height * activeRatioValue);
        if (width !== recalculatedWidth) {
            void updateSetting('developer.window.width', recalculatedWidth);
        }
    }, [height, activeRatioValue, width, isInitialised, updateSetting]);

    const previewWidth = useMemo(() => {
        if (activeRatioValue && height) {
            return Math.round(height * activeRatioValue);
        }
        return width;
    }, [activeRatioValue, height, width]);
    const previewPhysical = useMemo(() => {
        if (!previewWidth || !height) return undefined;
        return { w: Math.round(previewWidth * scaleFactor), h: Math.round(height * scaleFactor) };
    }, [previewWidth, height, scaleFactor]);

    const applyWindowSize = async () => {
        const baseHeight = clamp(height ?? MIN_HEIGHT, MIN_HEIGHT, MAX_HEIGHT);
        let targetWidth = clamp(width ?? baseHeight, MIN_WIDTH, MAX_WIDTH);

        if (activeRatioValue) {
            targetWidth = clamp(Math.round(baseHeight * activeRatioValue), MIN_WIDTH, MAX_WIDTH);
        }

        setIsApplying(true);
        try {
            const appWindow = getCurrentWindow();
            const isMaximized = await appWindow.isMaximized();
            if (isMaximized) {
                await appWindow.unmaximize();
            }

            await appWindow.setSize(new LogicalSize(targetWidth, baseHeight));
            await updateSetting('developer.window.width', targetWidth);
            await updateSetting('developer.window.height', baseHeight);
            await syncFromWindow(false);
            notify(`Window resized to ${targetWidth}x${baseHeight}`, 'success', 2600);
        } catch (error) {
            console.error('Failed to apply window size', error);
            notify('Could not resize the window. Check the console for details.', 'error', 3200);
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '620px' }}>
            <p style={{ margin: 0, color: 'var(--ln-muted)' }}>
                Set a precise window size for capturing consistent screenshots. When you pick an aspect ratio the height
                drives the width so the window snaps to that ratio.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                    type="button"
                    onClick={() => void syncFromWindow(true)}
                    style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--ln-border)',
                        background: 'var(--ln-bg)',
                        color: 'var(--ln-fg)',
                        cursor: 'pointer'
                    }}
                >
                    Use current window size
                </button>
                <div style={{ fontSize: '0.9rem', color: 'var(--ln-muted)' }}>
                    {currentSize
                        ? `Current: ${currentSize.logical.w} x ${currentSize.logical.h} (logical) | ${currentSize.physical.w} x ${currentSize.physical.h} (physical) @ ${scaleFactor.toFixed(2)}x`
                        : 'Current size not yet detected'}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '0' }}>
                    <div className="setting-label" style={{ fontWeight: 500, marginBottom: '6px' }}>Width (px)</div>
                    <NumberInput
                        def={{
                            kind: 'number',
                            key: 'developer.window.width',
                            min: MIN_WIDTH,
                            max: MAX_WIDTH,
                            step: 10,
                            disabled: isWidthLocked
                        }}
                    />
                    {isWidthLocked && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--ln-muted)', marginTop: '4px' }}>
                            Locked to height while an aspect ratio is active.
                        </div>
                    )}
                </div>

                <div style={{ flex: 1, minWidth: '0' }}>
                    <div className="setting-label" style={{ fontWeight: 500, marginBottom: '6px' }}>Height (px)</div>
                    <NumberInput
                        def={{
                            kind: 'number',
                            key: 'developer.window.height',
                            min: MIN_HEIGHT,
                            max: MAX_HEIGHT,
                            step: 10
                        }}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="setting-label" style={{ fontWeight: 500 }}>Aspect ratio</label>
                <select
                    value={aspectRatio}
                    onChange={(e) => void updateSetting('developer.window.aspectRatio', e.target.value)}
                    style={{
                        appearance: 'none',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--ln-border)',
                        background: 'var(--ln-bg)',
                        color: 'var(--ln-fg)',
                        fontSize: '0.95rem',
                        maxWidth: '260px'
                    }}
                >
                    {ASPECT_RATIOS.map(ratio => (
                        <option key={ratio.value} value={ratio.value}>{ratio.label}</option>
                    ))}
                </select>
                <div style={{ fontSize: '0.9rem', color: 'var(--ln-muted)' }}>
                    Width is recalculated from the height whenever an aspect ratio is selected.
                </div>
            </div>

            {selectedRatio.value === 'custom' && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: '140px', flex: '0 0 auto' }}>
                        <div className="setting-label" style={{ fontWeight: 500, marginBottom: '6px' }}>Custom width part</div>
                        <NumberInput
                            def={{
                                kind: 'number',
                                key: 'developer.window.customAspectWidth',
                                min: 1,
                                max: 100,
                                step: 1
                            }}
                        />
                    </div>
                    <div style={{ minWidth: '140px', flex: '0 0 auto' }}>
                        <div className="setting-label" style={{ fontWeight: 500, marginBottom: '6px' }}>Custom height part</div>
                        <NumberInput
                            def={{
                                kind: 'number',
                                key: 'developer.window.customAspectHeight',
                                min: 1,
                                max: 100,
                                step: 1
                            }}
                        />
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--ln-muted)' }}>
                        Example: enter 3 and 2 for a 3:2 ratio.
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button
                    onClick={applyWindowSize}
                    disabled={isApplying || !isInitialised}
                    style={{
                        padding: '10px 14px',
                        borderRadius: '6px',
                        border: '1px solid var(--ln-border)',
                        background: 'var(--ln-accent)',
                        color: '#fff',
                        cursor: isApplying || !isInitialised ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isApplying ? 'Applying...' : 'Apply size'}
                </button>
                <div style={{ fontSize: '0.95rem', color: 'var(--ln-muted)' }}>
                    Target: {previewWidth ?? '-'} x {height ?? '-'} (logical)
                    {previewPhysical ? ` | ${previewPhysical.w} x ${previewPhysical.h} (physical @ ${scaleFactor.toFixed(2)}x)` : ''}
                </div>
            </div>
        </div>
    );
};
