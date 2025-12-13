export interface OpenTab {
  id: string;
  path: string;          // Empty string '' for unsaved tabs
  title: string;         // 'Untitled' or extracted from H1
  mode: 'source';
  isDirty: boolean;
  isLoading: boolean;
  isUnsaved: boolean;    // true if not yet saved to disk
  editorState: string;
}

export interface TabsState {
  openTabs: OpenTab[];
  activeTabId: string | null;
}
