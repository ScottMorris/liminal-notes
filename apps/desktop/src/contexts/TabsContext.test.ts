import { describe, it, expect } from 'vitest';
import { tabsReducer } from './TabsContext';
import { TabsState, OpenTab } from '../types/tabs';

describe('tabsReducer', () => {
  const mockTab: OpenTab = {
    id: 'note-1',
    path: 'note-1.md',
    title: 'Note 1',
    mode: 'source',
    isDirty: false,
    isLoading: false,
    isUnsaved: false,
    editorState: '',
  };

  const initialState: TabsState = {
    openTabs: [],
    activeTabId: null,
  };

  it('should handle OPEN_TAB for a new tab', () => {
    const newState = tabsReducer(initialState, { type: 'OPEN_TAB', tab: mockTab });
    expect(newState.openTabs).toHaveLength(1);
    expect(newState.openTabs[0]).toEqual(mockTab);
    expect(newState.activeTabId).toBe(mockTab.id);
  });

  it('should handle OPEN_TAB for an existing tab', () => {
    const stateWithTab = {
      openTabs: [mockTab],
      activeTabId: null, // inactive
    };
    const newState = tabsReducer(stateWithTab, { type: 'OPEN_TAB', tab: mockTab });
    expect(newState.openTabs).toHaveLength(1);
    expect(newState.activeTabId).toBe(mockTab.id);
  });

  it('should handle CLOSE_TAB', () => {
    const stateWithTab = {
      openTabs: [mockTab],
      activeTabId: mockTab.id,
    };
    const newState = tabsReducer(stateWithTab, { type: 'CLOSE_TAB', tabId: mockTab.id });
    expect(newState.openTabs).toHaveLength(0);
    expect(newState.activeTabId).toBeNull();
  });

  it('should handle SWITCH_TAB', () => {
    const tab2: OpenTab = { ...mockTab, id: 'note-2', title: 'Note 2' };
    const state = {
      openTabs: [mockTab, tab2],
      activeTabId: mockTab.id,
    };
    const newState = tabsReducer(state, { type: 'SWITCH_TAB', tabId: tab2.id });
    expect(newState.activeTabId).toBe(tab2.id);
  });

  it('should handle UPDATE_TAB_DIRTY', () => {
    const state = {
      openTabs: [mockTab],
      activeTabId: mockTab.id,
    };
    const newState = tabsReducer(state, { type: 'UPDATE_TAB_DIRTY', tabId: mockTab.id, isDirty: true });
    expect(newState.openTabs[0].isDirty).toBe(true);
  });

  it('should handle UPDATE_TAB_STATE', () => {
    const state = {
      openTabs: [mockTab],
      activeTabId: mockTab.id,
    };
    const newState = tabsReducer(state, { type: 'UPDATE_TAB_STATE', tabId: mockTab.id, editorState: '{"doc": "hello"}' });
    expect(newState.openTabs[0].editorState).toBe('{"doc": "hello"}');
  });

  it('should handle UPDATE_TAB_TITLE', () => {
    const state = {
        openTabs: [mockTab],
        activeTabId: mockTab.id
    };
    const newState = tabsReducer(state, { type: 'UPDATE_TAB_TITLE', tabId: mockTab.id, title: 'New Title' });
    expect(newState.openTabs[0].title).toBe('New Title');
  });

  it('should handle UPDATE_TAB_PATH', () => {
      const state = {
          openTabs: [mockTab],
          activeTabId: mockTab.id
      };
      const newState = tabsReducer(state, { type: 'UPDATE_TAB_PATH', tabId: mockTab.id, path: 'new/path.md', isUnsaved: true });
      expect(newState.openTabs[0].path).toBe('new/path.md');
      expect(newState.openTabs[0].isUnsaved).toBe(true);
  });

  it('should handle LOAD_TABS', () => {
      const tab2 = { ...mockTab, id: 'note-2' };
      const newState = tabsReducer(initialState, { type: 'LOAD_TABS', tabs: [mockTab, tab2], activeTabId: 'note-2' });
      expect(newState.openTabs).toHaveLength(2);
      expect(newState.activeTabId).toBe('note-2');
  });
});
