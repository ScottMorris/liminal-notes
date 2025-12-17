import { RemindersFile } from './types';

export const CURRENT_SCHEMA_VERSION = 1;

export function migrateRemindersFile(file: any): RemindersFile {
  if (!file || typeof file !== 'object') {
    return { schemaVersion: CURRENT_SCHEMA_VERSION, reminders: [] };
  }

  // Initial migration (v1)
  if (!file.schemaVersion) {
      // If it's a completely new file or raw array (unlikely given spec)
      return { schemaVersion: CURRENT_SCHEMA_VERSION, reminders: [] };
  }

  // Future migrations go here
  // if (file.schemaVersion < 2) { ... }

  return file as RemindersFile;
}
