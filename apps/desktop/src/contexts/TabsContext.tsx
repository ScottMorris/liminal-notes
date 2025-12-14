import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { OpenTab, TabsState, AiState } from '../types/tabs';

type TabsAction =
  | { type: 'OPEN_TAB'; tab: OpenTab }
  | { type: 'CLOSE_TAB'; tabId: string }
  | { type: 'SWITCH_TAB'; tabId: string }
  | { type: 'KEEP_TAB'; tabId: string }
  | { type: 'UPDATE_TAB_DIRTY'; tabId: string; isDirty: boolean }
  | { type: 'UPDATE_TAB_STATE'; tabId: string; editorState: string }
  | { type: 'UPDATE_TAB_TITLE'; tabId: string; title: string }
  | { type: 'UPDATE_TAB_PATH'; tabId: string; path: string; isUnsaved: boolean }
  | { type: 'UPDATE_TAB_AI_STATE'; tabId: string; aiState: AiState }
  | { type: 'LOAD_TABS'; tabs: OpenTab[]; activeTabId: string | null }
  | { type: 'REORDER_TABS'; fromIndex: number; toIndex: number };

export function tabsReducer(state: TabsState, action: TabsAction): TabsState {
  switch (action.type) {
    case 'OPEN_TAB': {
      // Check if already open
      const existing = state.openTabs.find(t => t.id === action.tab.id);
      if (existing) {
        let updatedTabs = state.openTabs;
        if (existing.isPreview && !action.tab.isPreview) {
             updatedTabs = state.openTabs.map(t => t.id === existing.id ? { ...t, isPreview: false } : t);
        }
        return { ...state, openTabs: updatedTabs, activeTabId: action.tab.id };
      }

      // Logic for replacing Preview tab
      if (action.tab.isPreview) {
          const existingPreview = state.openTabs.find(t => t.isPreview);
          if (existingPreview) {
              const newTabs = state.openTabs.map(t => t.id === existingPreview.id ? action.tab : t);
              return {
                  openTabs: newTabs,
                  activeTabId: action.tab.id
              };
          }
      }

      return {
        openTabs: [...state.openTabs, action.tab],
        activeTabId: action.tab.id,
      };
    }
    case 'KEEP_TAB': {
      return {
        ...state,
        openTabs: state.openTabs.map(t =>
          t.id === action.tabId ? { ...t, isPreview: false } : t
        ),
      };
    }
    case 'CLOSE_TAB': {
      const newTabs = state.openTabs.filter(t => t.id !== action.tabId);

      let newActiveId = state.activeTabId;
      if (state.activeTabId === action.tabId) {
        if (newTabs.length > 0) {
           newActiveId = newTabs[newTabs.length - 1].id;
        } else {
           newActiveId = null;
        }
      }

      return {
        openTabs: newTabs,
        activeTabId: newActiveId,
      };
    }
    case 'SWITCH_TAB': {
      const exists = state.openTabs.some(t => t.id === action.tabId);
      if (!exists) return state;
      return { ...state, activeTabId: action.tabId };
    }
    case 'UPDATE_TAB_DIRTY': {
      return {
        ...state,
        openTabs: state.openTabs.map(t =>
          t.id === action.tabId ? { ...t, isDirty: action.isDirty } : t
        ),
      };
    }
    case 'UPDATE_TAB_STATE': {
      return {
        ...state,
        openTabs: state.openTabs.map(t =>
          t.id === action.tabId ? { ...t, editorState: action.editorState } : t
        ),
      };
    }
    case 'UPDATE_TAB_TITLE': {
      return {
        ...state,
        openTabs: state.openTabs.map(t =>
          t.id === action.tabId ? { ...t, title: action.title } : t
        ),
      };
    }
    case 'UPDATE_TAB_PATH': {
      return {
         ...state,
         openTabs: state.openTabs.map(t =>
            t.id === action.tabId ? { ...t, path: action.path, isUnsaved: action.isUnsaved } : t
         )
      };
    }
    case 'UPDATE_TAB_AI_STATE': {
      return {
        ...state,
        openTabs: state.openTabs.map(t =>
          t.id === action.tabId ? { ...t, aiState: action.aiState } : t
        ),
      };
    }
    case 'LOAD_TABS': {
      return {
        openTabs: action.tabs,
        activeTabId: action.activeTabId,
      };
    }
    case 'REORDER_TABS': {
        const { fromIndex, toIndex } = action;
        if (fromIndex < 0 || fromIndex >= state.openTabs.length ||
            toIndex < 0 || toIndex >= state.openTabs.length) {
            return state;
        }
        const newTabs = [...state.openTabs];
        const [movedTab] = newTabs.splice(fromIndex, 1);
        newTabs.splice(toIndex, 0, movedTab);
        return {
            ...state,
            openTabs: newTabs
        };
    }
    default:
      return state;
  }
}

interface TabsContextValue extends TabsState {
  dispatch: React.Dispatch<TabsAction>;
  openTab: (tab: OpenTab) => void;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  keepTab: (tabId: string) => void;
  updateTabDirty: (tabId: string, isDirty: boolean) => void;
  updateTabState: (tabId: string, editorState: string) => void;
  updateTabTitle: (tabId: string, title: string) => void;
  updateTabPath: (tabId: string, path: string, isUnsaved: boolean) => void;
  updateTabAiState: (tabId: string, aiState: AiState) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export function TabsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(tabsReducer, {
    openTabs: [],
    activeTabId: null,
  });

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('liminal-notes.tabs');
    if (saved) {
      try {
        const { tabs, activeTabId } = JSON.parse(saved);
        if (Array.isArray(tabs)) {
            dispatch({ type: 'LOAD_TABS', tabs, activeTabId });
        }
      } catch (e) {
        console.error("Failed to parse saved tabs:", e);
      }
    }
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    // Persist a lightweight, serialisable snapshot. Avoid aiState to prevent huge/circular payloads.
    const tabsToPersist = state.openTabs.map(({ aiState, ...rest }) => rest);
    const payload = JSON.stringify({
      tabs: tabsToPersist,
      activeTabId: state.activeTabId,
    });

    const save = () => {
      try {
        localStorage.setItem('liminal-notes.tabs', payload);
      } catch (err) {
        console.warn('Failed to persist tabs to localStorage', err);
      }
    };

    // Defer persistence to idle time to avoid blocking UI during drag/drop
    const idle = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    let handle: number | undefined;

    if (idle) {
      handle = idle(save, { timeout: 1000 });
    } else {
      handle = window.setTimeout(save, 0);
    }

    return () => {
      if (idle && handle !== undefined) {
        (window as any).cancelIdleCallback(handle);
      } else if (handle !== undefined) {
        clearTimeout(handle);
      }
    };
  }, [state.openTabs, state.activeTabId]);

  const openTab = (tab: OpenTab) => dispatch({ type: 'OPEN_TAB', tab });
  const closeTab = (tabId: string) => dispatch({ type: 'CLOSE_TAB', tabId });
  const switchTab = (tabId: string) => dispatch({ type: 'SWITCH_TAB', tabId });
  const keepTab = (tabId: string) => dispatch({ type: 'KEEP_TAB', tabId });
  const updateTabDirty = (tabId: string, isDirty: boolean) => dispatch({ type: 'UPDATE_TAB_DIRTY', tabId, isDirty });
  const updateTabState = (tabId: string, editorState: string) => dispatch({ type: 'UPDATE_TAB_STATE', tabId, editorState });
  const updateTabTitle = (tabId: string, title: string) => dispatch({ type: 'UPDATE_TAB_TITLE', tabId, title });
  const updateTabPath = (tabId: string, path: string, isUnsaved: boolean) => dispatch({ type: 'UPDATE_TAB_PATH', tabId, path, isUnsaved });
  const updateTabAiState = (tabId: string, aiState: AiState) => dispatch({ type: 'UPDATE_TAB_AI_STATE', tabId, aiState });
  const reorderTabs = (fromIndex: number, toIndex: number) => dispatch({ type: 'REORDER_TABS', fromIndex, toIndex });

  const value = {
    ...state,
    dispatch,
    openTab,
    closeTab,
    switchTab,
    keepTab,
    updateTabDirty,
    updateTabState,
    updateTabTitle,
    updateTabPath,
    updateTabAiState,
    reorderTabs
  };

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

export function useTabs() {
  const context = useContext(TabsContext);
  if (!context) throw new Error('useTabs must be used within TabsProvider');
  return context;
}
