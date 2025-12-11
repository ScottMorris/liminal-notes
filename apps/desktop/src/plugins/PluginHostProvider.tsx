import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode, useRef } from 'react';
import { LiminalPlugin, PluginContext, PluginId, NoteSnapshot, PluginStatusItem } from './types';
import { builtInPlugins } from './registry';

interface PluginHostState {
  enabledPlugins: Set<PluginId>;
  statusItems: PluginStatusItem[];
  setPluginEnabled: (id: PluginId, enabled: boolean) => void;

  // Event triggers called by the app
  notifyNoteOpened: (note: NoteSnapshot) => void;
  notifyNoteContentChanged: (note: NoteSnapshot) => void;
  notifyNoteSaved: (note: NoteSnapshot) => void;
}

const PluginHostContext = createContext<PluginHostState | null>(null);

const STORAGE_KEY = 'liminal-notes.plugins';

export function PluginHostProvider({ children }: { children: ReactNode }) {
  // Persistence logic
  const [enabledPlugins, setEnabledPlugins] = useState<Set<PluginId>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const map = JSON.parse(stored);
        const set = new Set<PluginId>();
        builtInPlugins.forEach(p => {
           // If in map, use map value. If not in map, use default.
           if (p.meta.id in map) {
             if (map[p.meta.id]) set.add(p.meta.id);
           } else {
             if (p.meta.enabledByDefault !== false) set.add(p.meta.id);
           }
        });
        return set;
      }
    } catch (e) {
      console.error('Failed to load plugin settings', e);
    }
    // Default fallback
    return new Set(builtInPlugins.filter(p => p.meta.enabledByDefault !== false).map(p => p.meta.id));
  });

  const [currentNote, setCurrentNote] = useState<NoteSnapshot | null>(null);

  // We need a ref for currentNote to access it inside callbacks that might close over stale state if we aren't careful,
  // though for `getStatusItems` passing `ctx` which calls `getCurrentNote` is safer if `getCurrentNote` is stable but reads from ref.
  // Construct the context object passed to plugins
  const pluginCtx = useMemo<PluginContext>(() => ({
    log: (msg, extra) => {
      console.log(`[PluginHost] ${msg}`, extra || '');
    },
    getCurrentNote: () => currentNote,
  }), [currentNote]);

  // Persist when enabledPlugins changes
  useEffect(() => {
    const map: Record<string, boolean> = {};
    builtInPlugins.forEach(p => {
      map[p.meta.id] = enabledPlugins.has(p.meta.id);
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  }, [enabledPlugins]);

  // Manage Activation/Deactivation
  // We need to track which plugins were previously active to call onDeactivate
  const activePluginsRef = useRef<Set<PluginId>>(new Set());

  useEffect(() => {
    const newlyEnabled = enabledPlugins;
    const previouslyEnabled = activePluginsRef.current;

    // Detect Deactivations
    for (const id of previouslyEnabled) {
      if (!newlyEnabled.has(id)) {
        const p = builtInPlugins.find(bp => bp.meta.id === id);
        if (p?.onDeactivate) {
          try {
            p.onDeactivate(pluginCtx);
          } catch (e) {
            console.error(`Error deactivating plugin ${id}`, e);
          }
        }
      }
    }

    // Detect Activations
    for (const id of newlyEnabled) {
      if (!previouslyEnabled.has(id)) {
        const p = builtInPlugins.find(bp => bp.meta.id === id);
        if (p?.onActivate) {
          try {
            p.onActivate(pluginCtx);
          } catch (e) {
            console.error(`Error activating plugin ${id}`, e);
          }
        }
      }
    }

    activePluginsRef.current = new Set(newlyEnabled);
  }, [enabledPlugins, pluginCtx]);

  // Status Items Calculation
  // Recalculate whenever currentNote changes or enabledPlugins changes
  const statusItems = useMemo(() => {
    let items: PluginStatusItem[] = [];
    builtInPlugins.forEach(p => {
      if (enabledPlugins.has(p.meta.id) && p.getStatusItems) {
        try {
          items = items.concat(p.getStatusItems(pluginCtx));
        } catch (e) {
          console.error(`Error getting status items for ${p.meta.id}`, e);
        }
      }
    });
    return items;
  }, [enabledPlugins, currentNote, pluginCtx]);


  // Handlers exposed to App
  const notifyNoteOpened = (note: NoteSnapshot) => {
    setCurrentNote(note);
    builtInPlugins.forEach(p => {
      if (enabledPlugins.has(p.meta.id) && p.onNoteOpened) {
        try {
          p.onNoteOpened(pluginCtx, note);
        } catch (e) {
          console.error(`Error in onNoteOpened for ${p.meta.id}`, e);
        }
      }
    });
  };

  const notifyNoteContentChanged = (note: NoteSnapshot) => {
    setCurrentNote(note); // Update state so getStatusItems sees new content
    builtInPlugins.forEach(p => {
      if (enabledPlugins.has(p.meta.id) && p.onNoteContentChanged) {
        try {
          p.onNoteContentChanged(pluginCtx, note);
        } catch (e) {
          console.error(`Error in onNoteContentChanged for ${p.meta.id}`, e);
        }
      }
    });
  };

  const notifyNoteSaved = (note: NoteSnapshot) => {
    builtInPlugins.forEach(p => {
      if (enabledPlugins.has(p.meta.id) && p.onNoteSaved) {
        try {
          p.onNoteSaved(pluginCtx, note);
        } catch (e) {
          console.error(`Error in onNoteSaved for ${p.meta.id}`, e);
        }
      }
    });
  };

  const setPluginEnabled = (id: PluginId, enabled: boolean) => {
    setEnabledPlugins(prev => {
      const next = new Set(prev);
      if (enabled) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <PluginHostContext.Provider value={{
      enabledPlugins,
      statusItems,
      setPluginEnabled,
      notifyNoteOpened,
      notifyNoteContentChanged,
      notifyNoteSaved
    }}>
      {children}
    </PluginHostContext.Provider>
  );
}

export function usePluginHost() {
  const context = useContext(PluginHostContext);
  if (!context) {
    throw new Error('usePluginHost must be used within a PluginHostProvider');
  }
  return context;
}
