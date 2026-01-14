# File Watching Strategy

## Overview

To support this, the application must react to external file changes (e.g., Dropbox synchronisation, external editors, or Git pulls).

## Desktop Strategy (Real-time)

On Desktop (Tauri), we utilize the `notify` crate to receive real-time file system events from the operating system.

### Architecture
1.  **Watcher (Rust)**: A background thread running `notify` watches the vault root recursively.
2.  **Filtering**: Events are filtered to ignore:
    *   `.git/` directory
    *   `.liminal/` directory (mostly internal state)
    *   System temp files
3.  **Debouncing**: Rapid events are coalesced (500ms debounce) to prevent UI flooding.
4.  **Events**: The backend emits:
    *   `vault:file-created`
    *   `vault:file-deleted`
    *   `vault:file-changed`
5.  **Frontend Reaction**:
    *   **Indices**: Search and Link indices update incrementally.
    *   **File Tree**: Refreshes immediately.
    *   **Editor**:
        *   If the open file changes and is **clean** (saved): Auto-reload.
        *   If the open file changes and is **dirty** (unsaved): Show "Conflict Banner".

## Mobile Strategy (Polling)

On Mobile (React Native), real-time file watching is technically expensive and unreliable across Android/iOS without native modules. We use a **Polling on Focus** strategy.

### Architecture
1.  **FileWatcher Service**: A singleton service that maintains a `Map<Path, MTime>` snapshot of the vault.
2.  **Triggers**:
    *   **App Foreground**: Triggered via `AppState` when the user switches back to the app.
    *   **Periodic**: Runs every 30 seconds while the app is active.
3.  **Diff Algorithm**:
    *   Lists all files (using `MobileSandboxVaultAdapter` recursion).
    *   Compares current MTime vs Previous Snapshot.
    *   Detects Additions, Deletions, and Modifications.
4.  **Events**: Emits standard events to the internal event bus.
5.  **UI/Index**: Same reaction logic as Desktop (Update Index, Banner vs Reload).

## Conflict Handling

When a file currently open in the editor is modified externally:

| Editor State | Action |
| :--- | :--- |
| **Clean** (No unsaved changes) | **Auto-reload**: The editor content is silently replaced with the new disk content. |
| **Dirty** (Unsaved changes) | **Conflict Banner**: A non-intrusive banner appears. |

### Conflict Banner Options
*   **Reload**: Discard local unsaved changes and load from disk.
*   **Keep Mine**: Dismiss the banner. The next Save will overwrite the disk (standard "Last Write Wins").
*   **Dismiss**: Hide banner, but state remains dirty.
