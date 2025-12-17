import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
    Reminder,
    RemindersFile,
    migrateRemindersFile,
    computeNextFireAt,
    nowISO
} from '@liminal-notes/reminders-core';
import {
    DesktopRemindersAdapter,
    loadRemindersFile,
    saveRemindersFile
} from '../features/reminders/desktopAdapter';
import { addMinutes } from 'date-fns';

interface RemindersContextType {
    reminders: Reminder[];
    isLoading: boolean;
    createReminder: (data: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'platform'>) => Promise<void>;
    updateReminder: (id: string, updates: Partial<Reminder>) => Promise<void>;
    deleteReminder: (id: string) => Promise<void>;
    snoozeReminder: (id: string, durationMinutes: number) => Promise<void>;
    completeReminder: (id: string) => Promise<void>;
    refreshReminders: () => Promise<void>;
    openReminderSheet: (reminderId: string) => void;
    closeReminderSheet: () => void;
    activeReminderId: string | null;
    getDebugInfo: () => Promise<any>;
}

const RemindersContext = createContext<RemindersContextType | undefined>(undefined);

export const useReminders = () => {
    const context = useContext(RemindersContext);
    if (!context) {
        throw new Error('useReminders must be used within a RemindersProvider');
    }
    return context;
};

export const RemindersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeReminderId, setActiveReminderId] = useState<string | null>(null);

    // Use a ref for the adapter to ensure singleton-like behavior if needed,
    // though purely functional is fine if stateless. The adapter has state (listeners).
    const adapterRef = useRef<DesktopRemindersAdapter | null>(null);

    // Initialize adapter
    if (!adapterRef.current) {
        adapterRef.current = new DesktopRemindersAdapter();
    }
    const adapter = adapterRef.current;

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const content = await loadRemindersFile();
            const json = content ? JSON.parse(content) : {};
            const file = migrateRemindersFile(json);
            setReminders(file.reminders);
            return file.reminders;
        } catch (e) {
            console.error('Failed to load reminders', e);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, []);

    const save = useCallback(async (newReminders: Reminder[]) => {
        const file: RemindersFile = {
            schemaVersion: 1,
            reminders: newReminders
        };
        await saveRemindersFile(JSON.stringify(file, null, 2));
        setReminders(newReminders);
    }, []);

    const reconcile = useCallback(async (currentReminders: Reminder[]) => {
        // Simple reconciliation:
        // 1. For each reminder, if status is scheduled, ensure it's in the platform.
        // 2. We don't do full diffing against `listScheduled` in this MVP step for simplicity,
        //    but we rely on "scheduleTime" returning new IDs and we store them.
        //    A robust implementation would listScheduled and remove unknown ones.

        let changed = false;
        const updatedReminders = [...currentReminders];

        // First, check permissions
        await adapter.requestPermission();

        const now = nowISO();

        for (let i = 0; i < updatedReminders.length; i++) {
            const r = updatedReminders[i];

            // If status is scheduled/snoozed, we expect a nextFireAt
            // If nextFireAt is in the past, it should have fired.
            // If we missed it (app closed), we might want to fire immediately or reschedule.
            // For MVP, if missed, we fire immediately (or let the planner decide next occurrence if repeating).
            // Actually, `computeNextFireAt` logic:
            // If it's one-shot and passed, it returns undefined (missed/done).
            // If repeating, it returns next future occurrence.

            // Re-evaluating nextFireAt
            // Note: If status is 'fired', user hasn't acted.
            // If status is 'scheduled', we check if we need to schedule.

            if (r.status === 'scheduled' || r.status === 'snoozed') {
                if (!r.nextFireAt) {
                    // Should not happen if scheduled, but compute it
                    const next = computeNextFireAt(r, now);
                    if (next) {
                        r.nextFireAt = next;
                        changed = true;
                    } else {
                        // Expired/Done
                        // If one-shot and time passed, mark as fired? Or done?
                        // If we are reconciling and find a past time, it means we missed it.
                        // We should probably show it (fire it).
                        // BUT `computeNextFireAt` returns undefined for past one-shot.
                        // So we might mark it as 'fired' so it shows up in UI?
                        // Or 'done'?
                        // Let's keep it simple: if valid future time, schedule it.
                        if (r.trigger.type === 'time' && !r.trigger.repeat) {
                             // It was one-shot.
                             // If `r.trigger.at` < now, it's missed.
                             // Mark as fired so user sees it?
                             // r.status = 'fired'; changed = true;
                        }
                    }
                }

                if (r.nextFireAt) {
                    // Schedule it
                    // We unconditionally reschedule to ensure it's in the OS (idempotency by generating new ID and cancelling old)
                    // Optimization: Check if `platform.desktop.scheduledIds` exists and matches `listScheduled`?
                    // For MVP, brute force: cancel old, schedule new.

                    if (r.platform?.desktop?.scheduledIds) {
                        await adapter.cancel(r.platform.desktop.scheduledIds);
                    }

                    const { platformIds } = await adapter.scheduleTime(r, r.nextFireAt);

                    r.platform = {
                        ...r.platform,
                        desktop: { scheduledIds: platformIds }
                    };
                    changed = true;
                }
            } else if (r.status === 'done' || r.status === 'dismissed') {
                // Ensure no schedule
                if (r.platform?.desktop?.scheduledIds) {
                    await adapter.cancel(r.platform.desktop.scheduledIds);
                    r.platform = { ...r.platform, desktop: { scheduledIds: [] } };
                    changed = true;
                }
            }
        }

        if (changed) {
            await save(updatedReminders);
        }
    }, [save, adapter]);

    // Initial load and listen
    useEffect(() => {
        let mounted = true;

        const init = async () => {
            const loaded = await load();
            if (mounted) {
                await reconcile(loaded);
            }
        };
        init();

        // Interaction listener
        const removeListener = adapter.onInteraction((evt) => {
            console.log('Interaction:', evt);
            if (evt.action === 'snooze-10m') {
                snoozeReminder(evt.reminderId, 10);
            } else if (evt.action === 'done') {
                completeReminder(evt.reminderId);
            } else {
                // Open
                setActiveReminderId(evt.reminderId);
                // Bring window to front is handled by OS/Tauri usually
            }
        });

        // Visibility / Focus listener for reconciliation
        const handleFocus = () => {
            // Re-load and reconcile on focus to catch up
            load().then((latest) => reconcile(latest));
        };
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', () => {
             if (document.visibilityState === 'visible') {
                 handleFocus();
             }
        });

        // Periodic reconciliation (every 5 min)
        const interval = setInterval(() => {
            load().then((latest) => reconcile(latest));
        }, 5 * 60 * 1000);

        return () => {
            mounted = false;
            removeListener();
            window.removeEventListener('focus', handleFocus);
            clearInterval(interval);
        };
    }, [load, reconcile, adapter]); // snoozeReminder/completeReminder not in dep array to avoid loops, wrapped below

    const createReminder = useCallback(async (data: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'platform'>) => {
        const now = nowISO();
        const newReminder: Reminder = {
            ...data,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
            status: 'scheduled',
            nextFireAt: undefined // will be computed in reconcile or immediately
        };

        // Compute initial fire time
        const next = computeNextFireAt(newReminder, now);
        if (next) {
            newReminder.nextFireAt = next;
        }

        const newList = [...reminders, newReminder];
        await save(newList);
        await reconcile(newList);
    }, [reminders, save, reconcile]);

    const updateReminder = useCallback(async (id: string, updates: Partial<Reminder>) => {
        const newList = reminders.map(r => {
            if (r.id === id) {
                // If trigger changed, clear nextFireAt to force re-computation
                const next = { ...r, ...updates, updatedAt: nowISO() };
                if (updates.trigger) {
                    next.nextFireAt = undefined;
                    // status usually goes back to scheduled if it was fired/done?
                    // Logic: If user edits a done reminder, does it become scheduled?
                    // Usually yes if they change the time.
                    // For now, let UI handle status changes, or infer:
                    if (next.status === 'done' || next.status === 'fired') {
                        next.status = 'scheduled';
                    }
                }
                return next;
            }
            return r;
        });
        await save(newList);
        await reconcile(newList);
    }, [reminders, save, reconcile]);

    const deleteReminder = useCallback(async (id: string) => {
        const target = reminders.find(r => r.id === id);
        if (target && target.platform?.desktop?.scheduledIds) {
            await adapter.cancel(target.platform.desktop.scheduledIds);
        }
        const newList = reminders.filter(r => r.id !== id);
        await save(newList);
    }, [reminders, save, adapter]);

    // Helpers need to be stable for useEffect
    // Ref-based wrappers or just using the latest state via functional updates?
    // But `reconcile` depends on `reminders`?
    // Actually `reconcile` takes `currentReminders` as arg in my impl above. Good.
    // But `createReminder` uses `reminders`.

    // I need to fix `snoozeReminder` and `completeReminder` availability in `useEffect`.
    // I'll define them here.

    const snoozeReminder = useCallback(async (id: string, durationMinutes: number) => {
        // We need the latest list.
        // Since this is called from event handler, `reminders` state might be stale if closure is stale.
        // We should reload or use functional update.
        // But `save` and `reconcile` need the full list.
        // I'll use `setReminders` with function to get latest, but `save` needs to write it.
        // Better: load from disk to be safe, then update.

        const content = await loadRemindersFile();
        const json = content ? JSON.parse(content) : { reminders: [] };
        const file = migrateRemindersFile(json);
        const list = file.reminders;

        const targetIndex = list.findIndex(r => r.id === id);
        if (targetIndex === -1) return;

        const r = list[targetIndex];
        const now = new Date();
        const nextFire = addMinutes(now, durationMinutes).toISOString();

        list[targetIndex] = {
            ...r,
            status: 'snoozed',
            nextFireAt: nextFire,
            updatedAt: nowISO()
        };

        await save(list);
        await reconcile(list);
    }, [save, reconcile]);

    const completeReminder = useCallback(async (id: string) => {
        const content = await loadRemindersFile();
        const json = content ? JSON.parse(content) : { reminders: [] };
        const file = migrateRemindersFile(json);
        const list = file.reminders;

        const targetIndex = list.findIndex(r => r.id === id);
        if (targetIndex === -1) return;

        const r = list[targetIndex];

        // If repeating, schedule next. Else done.
        // Wait, `computeNextFireAt` handles repeating from `now`.
        // If we mark done, and it's repeating, we should set status to 'scheduled' and advance time.

        if (r.trigger.type === 'time' && r.trigger.repeat) {
             // It's repeating.
             // We want next occurrence after NOW.
             const next = computeNextFireAt(r, nowISO());
             if (next) {
                 list[targetIndex] = {
                     ...r,
                     status: 'scheduled',
                     nextFireAt: next,
                     lastFiredAt: nowISO(), // approximation
                     updatedAt: nowISO()
                 };
             } else {
                 // No more occurrences?
                 list[targetIndex] = { ...r, status: 'done', updatedAt: nowISO() };
             }
        } else {
            list[targetIndex] = { ...r, status: 'done', updatedAt: nowISO() };
        }

        await save(list);
        await reconcile(list);
    }, [save, reconcile]);

    const refreshReminders = useCallback(async () => {
        const loaded = await load();
        await reconcile(loaded);
    }, [load, reconcile]);

    const getDebugInfo = useCallback(async () => {
        const scheduled = await adapter.listScheduled();
        return {
            reminders,
            scheduled
        };
    }, [reminders, adapter]);

    return (
        <RemindersContext.Provider value={{
            reminders,
            isLoading,
            createReminder,
            updateReminder,
            deleteReminder,
            snoozeReminder,
            completeReminder,
            refreshReminders,
            openReminderSheet: setActiveReminderId,
            closeReminderSheet: () => setActiveReminderId(null),
            activeReminderId,
            getDebugInfo
        }}>
            {children}
        </RemindersContext.Provider>
    );
};
