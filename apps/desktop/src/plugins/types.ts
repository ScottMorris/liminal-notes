import { SettingsSectionDef } from '../components/Settings/types';

export type PluginId = string;

export interface PluginMeta {
  id: PluginId;
  name: string;
  description?: string;
  version?: string;
  author?: string;
  enabledByDefault?: boolean;
}

export interface NoteSnapshot {
  path: string;   // relative path within vault
  title: string;  // derived like in the search index
  content: string;
}

export interface PluginStatusItem {
  id: string;      // unique per plugin
  label: string;   // short label, e.g. "Words"
  value: string;   // display value, e.g. "532"
  tooltip?: string;
}

export interface PluginContext {
  // Logging & debugging
  log: (message: string, extra?: unknown) => void;

  // Access to current state (read-only for now)
  getCurrentNote: () => NoteSnapshot | null;

  // Optional helpers (available in settings flows)
  updateSetting?: (key: string, value: unknown) => Promise<void>;
  notify?: (message: string, type?: 'info' | 'success' | 'error') => void;
}

export interface LiminalPlugin {
  meta: PluginMeta;

  // Settings
  settings?: SettingsSectionDef;
  onSettingsAction?: (ctx: PluginContext, actionId: string, settings: Record<string, any>) => void;

  // Lifecycle
  onActivate?: (ctx: PluginContext) => void;
  onDeactivate?: (ctx: PluginContext) => void;

  // Note-related hooks
  onNoteOpened?: (ctx: PluginContext, note: NoteSnapshot) => void;
  onNoteContentChanged?: (ctx: PluginContext, note: NoteSnapshot) => void;
  onNoteSaved?: (ctx: PluginContext, note: NoteSnapshot) => void;

  // Status bar
  getStatusItems?: (ctx: PluginContext) => PluginStatusItem[];
}
