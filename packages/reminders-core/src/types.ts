export type ReminderId = string;

export type ReminderTarget =
  | { type: "note"; noteId: string }
  | { type: "path"; path: string }
  | { type: "query"; query: string };

export type TimeTrigger = {
  type: "time";
  at: string; // ISO 8601 (local time stored with timezone below, e.g. "2023-10-27T10:00:00")
  timezone: string; // IANA, e.g. "America/Toronto"
  repeat?:
    | { kind: "daily"; interval?: number }
    | { kind: "weekly"; interval?: number; byWeekday?: number[] } // 0..6 (Sunday=0)
    | { kind: "monthly"; interval?: number; byMonthday?: number[] } // 1..31
    | { kind: "interval"; minutes: number };
};

export type LocationTrigger = {
  type: "location";
  lat: number;
  lon: number;
  radiusM: number;
  on: "enter" | "exit";
  label?: string;
};

export type ReminderTrigger = TimeTrigger | LocationTrigger;

export type ReminderStatus =
  | "scheduled"
  | "fired"
  | "snoozed"
  | "dismissed"
  | "done";

export type Reminder = {
  id: ReminderId;
  title: string;
  body?: string;
  target: ReminderTarget;
  trigger: ReminderTrigger;

  // User-facing options
  priority?: "low" | "normal" | "high";
  quietHours?: {
    enabled: boolean;
    startLocal: string; // "22:00"
    endLocal: string;   // "07:00"
  };

  // State
  status: ReminderStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  lastFiredAt?: string; // ISO
  nextFireAt?: string;  // ISO

  // Platform bookkeeping for reconciliation
  platform?: {
    desktop?: { scheduledIds?: string[] };
    mobile?: { scheduledIds?: string[] };
  };
};

export type RemindersFile = {
  schemaVersion: number;
  reminders: Reminder[];
};

export type NotificationPermission = "unknown" | "denied" | "granted";

export type ScheduledInfo = {
  platformId: string;
  reminderId?: string;
  fireAt?: string;
  title?: string;
};

export type NotificationInteraction = {
  reminderId: string;
  action?: "open" | "snooze-10m" | "done";
};
