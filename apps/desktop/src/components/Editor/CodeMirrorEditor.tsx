import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { closeBrackets } from '@codemirror/autocomplete';
import { createEditorTheme } from './editorTheme';
import { markdownDecorations } from './decorations';
import { useTheme } from '../../theme';
import { ContextMenu } from './ContextMenu/ContextMenu';
import { buildContextMenu } from './ContextMenu/menuBuilder';
import { commandRegistry } from '../../commands/CommandRegistry';
import type { MenuModel, MenuPosition } from './ContextMenu/types';
import type { EditorContext } from '../../commands/types';

export interface EditorHandle {
  insertAtCursor: (text: string) => void;
  focus: () => void;
  getEditorState: () => string;
  view: EditorView | null;
}

interface CodeMirrorEditorProps {
  value: string;
  initialState?: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onBlur?: () => void;
  noteId: string;
  path: string;
  getEditorContext: (view: EditorView) => EditorContext;
  onLinkClick?: (target: string) => void;
}

export const CodeMirrorEditor = forwardRef<EditorHandle, CodeMirrorEditorProps>(
  ({ value, initialState, onChange, onSave, onBlur, noteId, path, getEditorContext, onLinkClick }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const onSaveRef = useRef(onSave);
    const onChangeRef = useRef(onChange);
    const onBlurRef = useRef(onBlur);
    const onLinkClickRef = useRef(onLinkClick);
    const { themeId } = useTheme();

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{
      model: MenuModel;
      position: MenuPosition;
    } | null>(null);

    // Keep refs up to date
    useEffect(() => {
        onSaveRef.current = onSave;
    }, [onSave]);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        onBlurRef.current = onBlur;
    }, [onBlur]);

    useEffect(() => {
        onLinkClickRef.current = onLinkClick;
    }, [onLinkClick]);

    useImperativeHandle(ref, () => ({
      insertAtCursor: (text: string) => {
        if (!viewRef.current) return;
        const view = viewRef.current;
        const { state } = view;
        const { from, to } = state.selection.main;

        view.dispatch({
          changes: { from, to, insert: text },
          selection: { anchor: from + text.length },
        });
        view.focus();
      },
      focus: () => {
        viewRef.current?.focus();
      },
      getEditorState: () => {
        if (!viewRef.current) return '';
        const state = viewRef.current.state;
        return JSON.stringify({
          doc: state.doc.toString(),
          selection: {
            anchor: state.selection.main.anchor,
            head: state.selection.main.head,
          },
        });
      },
      get view() {
          return viewRef.current;
      }
    }));

    // Initialize Editor
    useEffect(() => {
      if (!editorRef.current) return;

      // Build keymap from command registry
      // Exclude 'Global' commands so they bubble up to App.tsx
      const registryKeymap = commandRegistry.getAllCommands()
        .filter(cmd => cmd.shortcut && cmd.group !== 'Global')
        .map(cmd => ({
          key: cmd.shortcut!.replace(/Ctrl|Cmd/g, 'Mod').replace(/\+/g, '-'),
          run: (view: EditorView) => {
            const context = getEditorContext(view);
            commandRegistry.executeCommand(cmd.id, context, view);
            return true;
          }
        }));

      let startState: EditorState;
      const extensions = [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        closeBrackets(),
        markdown(),
        markdownDecorations,
        createEditorTheme(),
        keymap.of([
          ...registryKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          {
            key: 'Mod-s',
            run: () => {
              // Call the current onSave from ref
              onSaveRef.current();
              return true;
            },
          },
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.domEventHandlers({
            blur: () => {
                if (onBlurRef.current) {
                    onBlurRef.current();
                }
            },
            click: (event, view) => {
                const target = event.target as HTMLElement;
                // Traverse up to find the wikilink element, since the target might be a text node or inner element
                const wikilinkElement = target.closest?.('.cm-wikilink') || (target.parentElement?.closest?.('.cm-wikilink'));

                if (wikilinkElement && (event.ctrlKey || event.metaKey)) {
                     const linkTarget = wikilinkElement.getAttribute('data-wikilink-target');
                     if (linkTarget && onLinkClickRef.current) {
                         event.preventDefault();
                         onLinkClickRef.current(linkTarget);
                     }
                }
            }
        })
      ];

      if (initialState) {
        try {
          const parsed = JSON.parse(initialState);
          startState = EditorState.create({
            doc: parsed.doc,
            selection: {
                anchor: parsed.selection.anchor,
                head: parsed.selection.head
            },
            extensions,
          });
        } catch (e) {
          console.error("Failed to restore editor state:", e);
           startState = EditorState.create({
            doc: value,
            extensions,
          });
        }
      } else {
        startState = EditorState.create({
          doc: value,
          extensions,
        });
      }

      const view = new EditorView({
        state: startState,
        parent: editorRef.current,
      });

      viewRef.current = view;

      return () => {
        view.destroy();
        viewRef.current = null;
      };
      // We explicitly do not depend on `value` or `themeId` here to avoid re-creating the editor
      // Updates are handled by other effects
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle incoming value changes (e.g. from loading a new note)
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;

      const currentValue = view.state.doc.toString();
      if (value !== currentValue) {
        view.dispatch({
          changes: { from: 0, to: currentValue.length, insert: value },
        });
      }
    }, [value]);

    // Handle Theme Changes
    useEffect(() => {
      // Since we use CSS variables in our theme definition, styles update automatically.
    }, [themeId]);

    // Context Menu Handler
    function handleContextMenu(e: MouseEvent) {
      if (!viewRef.current) return;

      e.preventDefault();

      // Get full context from parent
      const context = getEditorContext(viewRef.current);
      const model = buildContextMenu(context, commandRegistry);

      setContextMenu({
        model,
        position: { x: e.clientX, y: e.clientY },
      });
    }

    // Attach Context Menu Listener
    useEffect(() => {
      const editorEl = viewRef.current?.dom;
      if (!editorEl) return;

      editorEl.addEventListener('contextmenu', handleContextMenu);
      return () => {
        editorEl.removeEventListener('contextmenu', handleContextMenu);
      };
    }, [noteId, path]);

    async function handleMenuItemClick(commandId: string) {
      if (!viewRef.current) return;

      try {
        const context = getEditorContext(viewRef.current);
        await commandRegistry.executeCommand(commandId, context, viewRef.current);
        viewRef.current.focus();
      } catch (e) {
        console.error("Failed to execute command from menu:", e);
      }
    }

    return (
      <>
        <div ref={editorRef} style={{ height: '100%', width: '100%' }} className="cm-editor-container" />

        {contextMenu && (
          <ContextMenu
            model={contextMenu.model}
            position={contextMenu.position}
            onClose={() => setContextMenu(null)}
            onItemClick={handleMenuItemClick}
          />
        )}
      </>
    );
  }
);

CodeMirrorEditor.displayName = 'CodeMirrorEditor';
