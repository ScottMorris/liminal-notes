# Auto-Save

**Description**
To improve data safety and user experience, the application should automatically save changes to notes. Currently, saving is manual via `Ctrl+S` or triggered on specific actions (like closing a tab in some contexts).

**Requirements**
- [ ] Implement auto-save functionality that triggers after a short delay of inactivity (e.g., 1000ms after last keystroke).
- [ ] Ensure auto-save does not conflict with manual save or file system operations.
- [ ] Optionally provide a setting to enable/disable auto-save.
