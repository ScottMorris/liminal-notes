# Reminders & Notifications

> Goal: A cross-platform reminders system with **one shared data model + logic**, implemented by platform-specific adapters.
>
> Targets:
>
> * **Desktop**: Tauri + React (time-based notifications)
> * **Mobile**: React Native (time-based + optional location-based reminders)

## Goals

* Reminders are **first-class, vault-stored objects** (local-first, syncable).
* Same reminder semantics across platforms (repeat rules, snooze, quiet hours, state transitions).
* Platform adapters handle:

  * notification permissions
  * scheduling/cancelling/querying scheduled notifications
  * interaction events (tap/actions)
* Mobile may support location triggers; desktop does not.

## Non-goals

* Full calendar integration (future).
* Server push notifications.
* A full task manager (reminders may attach to tasks, but tasks are separate).

## Terminology

* **Reminder**: User-authored object that can fire one or more notifications.
* **Trigger**: The condition that causes a reminder to fire (time or location).
* **Delivery**: The act of displaying a notification.
* **Reconciliation**: Ensuring OS scheduled notifications match vault state.

## Platform Capability Matrix

| Capability                  |      Desktop (Tauri) | Mobile (React Native) |
| --------------------------- | -------------------: | --------------------: |
| Time trigger                |                    ✅ |                     ✅ |
| OS scheduled notifications  | ✅ (via Tauri plugin) |    ✅ (via RN library) |
| Location trigger            |                    ❌ |          ✅ (optional) |
| Notification action buttons |    ⚠️ (not required) |          ✅ (optional) |

> The app MUST expose `capabilities()` so the UI can adapt without hard-coded platform checks.

## Architecture

### Shared Core Package

Create a pure TS module used by both clients:

* `reminders-core/` (or `packages/reminders-core/`)

  * Data model + validation
  * Scheduling planner (next occurrences)
  * Snooze / quiet hours logic
  * Reconciliation algorithm
  * Interaction event protocol

No platform code here.

### Platform Adapters

* Desktop (Tauri): `reminders-adapter-tauri/`
* Mobile (RN): `reminders-adapter-rn/`
* Optional: Mobile geofencing: `reminders-adapter-rn-geofence/`

Adapters implement a common interface (see below).

## Data Model

### Reminder

Canonical reminder objects are stored in the vault.

```ts
export type ReminderId = string;

export type ReminderTarget =
  | { type: "note"; noteId: string }
  | { type: "path"; path: string }
  | { type: "query"; query: string };

export type TimeTrigger = {
  type: "time";
  at: string; // ISO 8601 (local time stored with timezone below)
  timezone: string; // IANA, e.g. "America/Toronto"
  repeat?:
    | { kind: "daily"; interval?: number }
    | { kind: "weekly"; interval?: number; byWeekday?: number[] } // 0..6
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
```

### Notes about timestamps

* Store user intent using local datetime + timezone for time triggers.
* `nextFireAt` is computed and stored as ISO for convenience.
* The planner is responsible for DST correctness.

## Vault Storage

### File location

* `/.liminal/reminders.json`

### File format

```json
{
  "schemaVersion": 1,
  "reminders": [
    { "id": "...", "title": "...", "trigger": { "type": "time", "at": "...", "timezone": "..." }, "target": { "type": "note", "noteId": "..." }, "status": "scheduled", "createdAt": "...", "updatedAt": "..." }
  ]
}
```

### Migration

* Changes MUST bump `schemaVersion`.
* Provide `migrateRemindersFile(v)` in core.

## Adapter Interface

All platforms MUST implement the following minimal interface.

```ts
export type NotificationPermission = "unknown" | "denied" | "granted";

export type ScheduledInfo = {
  platformId: string;
  reminderId?: string; // best-effort mapping if platform supports metadata
  fireAt?: string;
  title?: string;
};

export type NotificationInteraction = {
  reminderId: string;
  action?: "open" | "snooze-10m" | "done";
};

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
```

### Location adapter

A separate optional adapter may be used for location triggers:

```ts
export interface LocationAdapter {
  capabilities(): { geofence: boolean; foregroundOnly: boolean };

  requestPermission(): Promise<"denied" | "granted-while-in-use" | "granted-always">;

  registerGeofence(reminder: Reminder): Promise<{ geofenceId: string }>;
  unregisterGeofence(geofenceId: string): Promise<void>;

  onGeofenceEvent(handler: (evt: { reminderId: string; type: "enter" | "exit" }) => void): () => void;
}
```

## Core Logic

### Planner

Responsible for:

* computing `nextFireAt` from `trigger`
* applying quiet hours rules
* generating occurrences for repeating reminders

Key function signatures:

```ts
computeNextFireAt(reminder: Reminder, nowIso: string): string | undefined
applyQuietHours(nextFireAtIso: string, quietHours: Reminder["quietHours"], tz: string): string
```

### State transitions

* `scheduled` → `fired` when delivered
* `fired` → `scheduled` when repeating and next occurrence exists
* `scheduled`/`fired` → `snoozed` when user snoozes
* any → `done` when completed
* any → `dismissed` when dismissed without completing (optional)

### Snooze

* Snooze is implemented by setting `nextFireAt = now + duration` and rescheduling.
* Default snooze options: 10m, 1h, tomorrow morning.

### Reconciliation

On app launch and on resume:

1. Load vault reminders
2. For each reminder, compute expected schedules (typically only the next occurrence)
3. Ask adapter for `listScheduled()` if supported
4. Diff:

   * cancel stale platform schedules
   * schedule missing ones
5. Persist updated `platform.scheduledIds` in vault

> Desktop MUST reconcile. Mobile SHOULD reconcile.

## UX Requirements

### Create reminder entry points

* Command palette: “Remind me…”
* Note context menu: “Add reminder…”
* Reminders panel: “New reminder”

### Reminders panel

* Tabs: Upcoming, Snoozed, Done
* Filters: Today, This week, Linked to current note
* Actions: Open, Snooze, Mark done, Edit, Delete

### Editing

Editing a reminder MUST:

* update reminder in vault
* cancel old platform schedules
* schedule new platform schedules

### Notification interaction

* Tap should open app and route to reminder target.
* Mobile MAY include action buttons for snooze/done.
* Desktop action buttons are not required; show actions in-app when opened.

## Desktop Implementation Notes (Tauri)

* Use `@tauri-apps/plugin-notification` for permission + delivery + scheduling.
* Store scheduled notification IDs for cancellation/reconciliation.
* Ensure Windows behaviour in dev vs installed is documented for contributors.

## Mobile Implementation Notes (React Native)

Two acceptable approaches:

* Expo Notifications (if using Expo)
* Notifee (if going more native)

The adapter layer MUST hide which one is used.

### Location triggers (mobile)

Phased:

1. **Foreground-only (soft)**: evaluate location triggers when app is active.
2. **Geofence (background)**: register OS geofences and fire notifications on enter/exit.

## Testing Checklist

* Create one-shot time reminder → fires at correct time
* Edit reminder time → old schedule removed, new one scheduled
* Repeating reminder → schedules next occurrence after firing
* Snooze → pushes fire time out and only fires once
* Quiet hours → does not fire during quiet window
* Reconciliation: delete reminder → scheduled OS notification removed
* DST boundary: reminder near DST shift fires at expected local time

## Telemetry / Debugging (Local)

* Add a “Reminders Debug” view (dev-only) showing:

  * vault reminders
  * computed nextFireAt
  * platform scheduled list (if supported)
  * last reconciliation results

## Future Extensions

* Reminder templates (“review note in 2 weeks”)
* Spaced repetition plugin
* Calendar import/export
* “Remind me when I open Liminal Notes next” (in-app trigger)
