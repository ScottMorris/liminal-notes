import { Reminder, NotificationPermission, ScheduledInfo, NotificationInteraction } from './types';

export interface RemindersAdapter {
  capabilities(): {
    time: boolean;
    location: boolean;
    actions: boolean;
    listScheduled: boolean;
  };

  getPermission(): Promise<NotificationPermission>;
  requestPermission(): Promise<NotificationPermission>;

  // Schedule returns platform IDs used for reconciliation/cancellation.
  scheduleTime(reminder: Reminder, fireAtIso: string): Promise<{ platformIds: string[] }>;

  cancel(platformIds: string[]): Promise<void>;
  cancelAll?(): Promise<void>;

  listScheduled?(): Promise<ScheduledInfo[]>;

  onInteraction(handler: (evt: NotificationInteraction) => void): () => void;
}
