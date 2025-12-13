export interface AiState {
  result: any | null; // Using any to avoid circular dependency with aiController types
  isLoading: boolean;
  error: string | null;
}

export interface OpenTab {
  id: string;
  path: string;          // Empty string '' for unsaved tabs
  title: string;         // 'Untitled' or extracted from H1
  mode: 'source';
  isDirty: boolean;
  isLoading: boolean;
  isUnsaved: boolean;    // true if not yet saved to disk
  editorState: string;
  aiState?: AiState;
}

export interface TabsState {
  openTabs: OpenTab[];
  activeTabId: string | null;
}
