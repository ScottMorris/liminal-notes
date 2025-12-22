import {
  RemindersAdapter,
  Reminder,
  NotificationPermission,
  ScheduledInfo,
  NotificationInteraction
} from '@liminal-notes/reminders-core';
import {
  sendNotification,
  requestPermission,
  isPermissionGranted,
  cancel,
  pending,
  onAction,
  Schedule
} from '@tauri-apps/plugin-notification';
import { desktopVault } from '../../adapters/DesktopVaultAdapter';

const REMINDERS_FILE = '.liminal/reminders.json';

export class DesktopRemindersAdapter implements RemindersAdapter {
  private interactionHandler: ((evt: NotificationInteraction) => void) | null = null;
  private unlistenAction: (() => void) | null = null;

  constructor() {
    this.initListener();
  }

  private async initListener() {
    // Listen for notification clicks
    try {
        const unlisten = await onAction((notification) => {
          console.log('Notification action:', notification);
          if (this.interactionHandler) {
            // Extract reminderId from extra or id mapping
            const reminderId = notification.extra?.reminderId as string;
            const action = notification.actionTypeId === 'snooze' ? 'snooze-10m' :
                           notification.actionTypeId === 'done' ? 'done' :
                           'open'; // Default to open

            if (reminderId) {
                this.interactionHandler({
                    reminderId,
                    action: action as any
                });
            }
          }
        });
        // onAction returns Promise<UnlistenFn> usually, where UnlistenFn is () => void.
        // We cast to be safe if types mismatch.
        this.unlistenAction = unlisten as unknown as () => void;
    } catch (e) {
        console.warn("Failed to init notification listener (this is expected if permissions are missing or in dev mode)", e);
    }
  }

  capabilities() {
    return {
      time: true,
      location: false,
      actions: false, // We handle actions in-app for MVP
      listScheduled: true,
    };
  }

  async getPermission(): Promise<NotificationPermission> {
    const granted = await isPermissionGranted();
    return granted ? 'granted' : 'unknown'; // Tauri doesn't distinguish denied vs unknown easily in check
  }

  async requestPermission(): Promise<NotificationPermission> {
    const permission = await requestPermission();
    // permission is string: 'granted', 'denied', 'default'
    if (permission === 'granted') return 'granted';
    if (permission === 'denied') return 'denied';
    return 'unknown';
  }

  async scheduleTime(reminder: Reminder, fireAtIso: string): Promise<{ platformIds: string[] }> {
    // Generate a numeric ID (32-bit signed integer range safe)
    const id = Math.floor(Math.random() * 2000000000);

    const date = new Date(fireAtIso);

    // Schedule
    sendNotification({
        id,
        title: reminder.title,
        body: reminder.body || 'Reminder',
        schedule: Schedule.at(date),
        extra: {
            reminderId: reminder.id
        }
    });

    return { platformIds: [id.toString()] };
  }

  async cancel(platformIds: string[]): Promise<void> {
    const ids = platformIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (ids.length > 0) {
        try {
            await cancel(ids);
        } catch (e) {
            console.warn("Failed to cancel notifications", e);
        }
    }
  }

  async listScheduled(): Promise<ScheduledInfo[]> {
    try {
        const notifications = await pending();
        return notifications.map(n => ({
            platformId: n.id.toString(),
            // We can't easily get extra data back from pending() in some implementations,
            // but if we can:
            // note: pending() returns PendingNotification which has id, title, body, schedule.
            // It does NOT strictly guarantee `extra` is available in the type definition I saw earlier?
            // Let's check the type definition I cat'ed.
            // interface PendingNotification { id: number; title?: string; body?: string; schedule: Schedule; }
            // It does NOT have extra.
            // So we can't map back to reminderId efficiently without storing it ourselves or title parsing.
            // However, we only use this for diffing. If we can't identify the reminder, we might assume it's stale if we don't recognize the ID?
            // But we store IDs in the vault.
            // So we match by platformId.
            fireAt: n.schedule.at?.date.toISOString(), // Assuming schedule.at exists
            title: n.title
        }));
    } catch (e) {
        console.warn("Failed to list scheduled notifications", e);
        return [];
    }
  }

  onInteraction(handler: (evt: NotificationInteraction) => void): () => void {
    this.interactionHandler = handler;
    return () => {
        this.interactionHandler = null;
    };
  }
}

// Vault I/O Helpers
export async function loadRemindersFile(): Promise<string | null> {
    try {
        const { content } = await desktopVault.readNote(REMINDERS_FILE);
        return content;
    } catch (e) {
        // File might not exist
        return null;
    }
}

export async function saveRemindersFile(content: string): Promise<void> {
    await desktopVault.writeNote(REMINDERS_FILE, content);
}
