export type SettingKind =
  | "boolean"
  | "select"
  | "string"
  | "number"
  | "slider"
  | "action"
  | "computed"
  | "collection"
  | "search";

export interface SettingOption {
    value: string;
    label: string;
}

export interface SettingOptionGroup {
    label: string;
    options: SettingOption[];
}

export interface SettingControlDef {
  key?: string; // Key in settings store. If missing, it might be an action or pure UI.
  kind: SettingKind;
  label?: string; // Label for the control itself (e.g. button text, or aria-label)
  options?: (SettingOption | SettingOptionGroup)[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  intent?: "normal" | "danger";
  actionId?: string; // identifier for action handlers
  collectionId?: string; // identifier for collection source
  // For collection items or specific logic
  renderItem?: (item: any) => React.ReactNode;
}

export interface SettingRowDef {
  id: string; // Row ID
  label: string;
  description?: string;
  controls: SettingControlDef[];
}

export interface SettingsGroupDef {
  id: string;
  title?: string;
  rows: SettingRowDef[];
}

export interface SettingsSectionDef {
  id: string;
  title: string;
  groups: SettingsGroupDef[];
}

export type SettingsActionHandler = (id: string) => void | Promise<void>;
