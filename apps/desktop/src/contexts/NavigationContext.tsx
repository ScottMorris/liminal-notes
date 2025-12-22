import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useTabs } from './TabsContext';

interface HistoryEntry {
  tabId: string;
  path: string;
  editorState: string | null; // Serialized EditorState
  timestamp: number;
}

interface NavigationContextValue {
  history: HistoryEntry[];
  currentIndex: number;
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  pushEntry: (tabId: string, path: string, state: string | null) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const { activeTabId, openTabs, switchTab, updateTabState } = useTabs();

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const isNavigatingRef = useRef(false);
  const previousTabIdRef = useRef<string | null>(null);

  // Initialize previousTabId on mount or when activeTabId is first set
  useEffect(() => {
    if (activeTabId && previousTabIdRef.current === null) {
        previousTabIdRef.current = activeTabId;
        // Push initial entry
        const tab = openTabs.find(t => t.id === activeTabId);
        if (tab) {
             const entry: HistoryEntry = {
                tabId: tab.id,
                path: tab.path,
                editorState: tab.editorState || null,
                timestamp: Date.now()
            };
            setHistory([entry]);
            setCurrentIndex(0);
        }
    }
  }, [activeTabId]); // Dependencies intentionally minimal to run once-ish logic

  // Listen for active tab changes to record history
  useEffect(() => {
    if (!activeTabId) return;

    // If we are currently processing a back/forward action, do not push a new history entry
    if (isNavigatingRef.current) {
        isNavigatingRef.current = false;
        // But we DO need to update previousTabId so the next normal navigation works
        previousTabIdRef.current = activeTabId;
        return;
    }

    if (activeTabId === previousTabIdRef.current) return;

    // A normal navigation (click link, sidebar, etc.) has occurred.
    // We want to verify if we need to record the *previous* tab's final state?
    // Actually, TabsContext should have the latest state of the previous tab by now
    // because EditorPane saves on blur/switch.

    const prevId = previousTabIdRef.current;
    if (prevId) {
        // Find the previous tab to update its state in history if needed?
        // Actually, the logic is: History represents "Where I was".
        // If I was at A, and I go to B.
        // History should contain [A, B].
        // If I was at A (index 0), and I go to B.
        // We truncate anything after index 0.
        // We push B.
        // But we also might want to update the entry for A with its *last known state* before we left it?
        // Yes, otherwise "Back" restores A to how it was when it was *first opened*, not when we left it.

        // Update the entry at currentIndex (which represents prevId) with the latest state from openTabs
        // Wait, openTabs has the *current* state.

        const prevTab = openTabs.find(t => t.id === prevId);
        if (prevTab) {
             setHistory(prev => {
                 const newHistory = [...prev];
                 if (currentIndex >= 0 && currentIndex < newHistory.length) {
                      newHistory[currentIndex] = {
                          ...newHistory[currentIndex],
                          editorState: prevTab.editorState || null
                      };
                 }
                 return newHistory;
             });
        }
    }

    // Now push the new tab
    const currentTab = openTabs.find(t => t.id === activeTabId);
    if (currentTab) {
        const newEntry: HistoryEntry = {
            tabId: currentTab.id,
            path: currentTab.path,
            editorState: currentTab.editorState || null,
            timestamp: Date.now()
        };

        setHistory(prev => {
            const newHistory = prev.slice(0, currentIndex + 1);
            newHistory.push(newEntry);
            return newHistory;
        });
        setCurrentIndex(prev => prev + 1);
    }

    previousTabIdRef.current = activeTabId;
  }, [activeTabId, openTabs]); // Re-run when activeTabId changes. openTabs needed to get state.

  const goBack = useCallback(() => {
      if (currentIndex > 0) {
          const prevEntry = history[currentIndex - 1];
          // We are about to leave current tab. Update its state in history?
          // Yes, so if we go forward again, we restore it.
          const currentTab = openTabs.find(t => t.id === activeTabId);
          if (currentTab) {
               // Update current history entry
               const updatedHistory = [...history];
               updatedHistory[currentIndex] = {
                   ...updatedHistory[currentIndex],
                   editorState: currentTab.editorState || null
               };
               setHistory(updatedHistory);
          }

          isNavigatingRef.current = true;

          // Restore state to tab
          if (prevEntry.editorState) {
              updateTabState(prevEntry.tabId, prevEntry.editorState);
          }

          switchTab(prevEntry.tabId);
          setCurrentIndex(currentIndex - 1);
      }
  }, [currentIndex, history, activeTabId, openTabs, switchTab, updateTabState]);

  const goForward = useCallback(() => {
      if (currentIndex < history.length - 1) {
          const nextEntry = history[currentIndex + 1];

           // Update current state before leaving
          const currentTab = openTabs.find(t => t.id === activeTabId);
          if (currentTab) {
               const updatedHistory = [...history];
               updatedHistory[currentIndex] = {
                   ...updatedHistory[currentIndex],
                   editorState: currentTab.editorState || null
               };
               setHistory(updatedHistory);
          }

          isNavigatingRef.current = true;

          if (nextEntry.editorState) {
              updateTabState(nextEntry.tabId, nextEntry.editorState);
          }
          switchTab(nextEntry.tabId);
          setCurrentIndex(currentIndex + 1);
      }
  }, [currentIndex, history, activeTabId, openTabs, switchTab, updateTabState]);

  const pushEntry = useCallback((tabId: string, path: string, state: string | null) => {
      // Manual push if needed (though useEffect handles most)
  }, []);

  const value = {
      history,
      currentIndex,
      goBack,
      goForward,
      canGoBack: currentIndex > 0,
      canGoForward: currentIndex < history.length - 1,
      pushEntry
  };

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) throw new Error('useNavigation must be used within NavigationProvider');
  return context;
}
