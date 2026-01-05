import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { closeBrackets } from '@codemirror/autocomplete';
import { createEditorTheme } from './editorTheme';
import { markdownDecorations } from '@liminal-notes/core-shared/editor/decorations';
import { frontmatterHider } from '@liminal-notes/core-shared/editor/frontmatterHider';
import { spellcheckExtension } from './spellcheck/spellcheckExtension';
import { spellcheckCore } from '../../features/spellcheck/spellcheckCore';
import { useTheme } from '../../theme/ThemeProvider';
import { ContextMenu } from './ContextMenu/ContextMenu';
import { buildContextMenu } from './ContextMenu/menuBuilder';
import { commandRegistry } from '../../commands/CommandRegistry';
import type { MenuModel, MenuPosition, MenuItem } from './ContextMenu/types';
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
  showLineNumbers?: boolean;
  readableLineLength?: boolean;
  wordWrap?: boolean;
}

export const CodeMirrorEditor = forwardRef<EditorHandle, CodeMirrorEditorProps>(
  ({ value, initialState, onChange, onSave, onBlur, noteId, path, getEditorContext, onLinkClick, showLineNumbers = true, readableLineLength = false, wordWrap = false }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const onSaveRef = useRef(onSave);
    const onChangeRef = useRef(onChange);
    const onBlurRef = useRef(onBlur);
    const onLinkClickRef = useRef(onLinkClick);
    const { themeId } = useTheme();

    const lineNumbersCompartment = useRef(new Compartment()).current;
    const wordWrapCompartment = useRef(new Compartment()).current;

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{
      model: MenuModel;
      position: MenuPosition;
    } | null>(null);

    // Calculate frontmatter offset for line numbers
    const getFrontmatterOffset = (text: string): number => {
        if (!text.startsWith('---\n')) return 0;
        const endFenceIndex = text.indexOf('\n---', 4);
        if (endFenceIndex === -1) return 0;

        let lines = 1;
        for (let i = 0; i < endFenceIndex; i++) {
            if (text[i] === '\n') lines++;
        }
        return lines + 1;
    };

    const [frontmatterOffset, setFrontmatterOffset] = useState(() => getFrontmatterOffset(value));

    useEffect(() => {
        setFrontmatterOffset(getFrontmatterOffset(value));
    }, [value]);

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
      // Exclude global commands so they bubble up to window listeners
      const registryKeymap = commandRegistry.getAllCommands()
        .filter(cmd => cmd.shortcut && cmd.context !== 'Global')
        .map(cmd => ({
          key: cmd.shortcut!.replace(/Ctrl|Cmd/g, 'Mod').replace(/\+/g, '-').toLowerCase(),
          run: (view: EditorView) => {
            const context = getEditorContext(view);
            commandRegistry.executeCommand(cmd.id, context);
            return true;
          }
        }));

      let startState: EditorState;
      const extensions = [
        lineNumbersCompartment.of(showLineNumbers ? lineNumbers() : []),
        wordWrapCompartment.of(wordWrap ? EditorView.lineWrapping : []),
        highlightActiveLine(),
        history(),
        closeBrackets(),
        markdown({ extensions: [GFM] }),
        markdownDecorations,
        frontmatterHider,
        spellcheckExtension,
        createEditorTheme(),
        keymap.of([
          ...registryKeymap,
          ...defaultKeymap,
          ...historyKeymap,
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reconfigure extensions when props change
    useEffect(() => {
        if (viewRef.current) {
            viewRef.current.dispatch({
                effects: [
                    lineNumbersCompartment.reconfigure(showLineNumbers ? lineNumbers({
                        formatNumber: (n) => {
                            if (n <= frontmatterOffset) return "";
                            return (n - frontmatterOffset).toString();
                        }
                    }) : []),
                    wordWrapCompartment.reconfigure(wordWrap ? EditorView.lineWrapping : [])
                ]
            });
        }
    }, [showLineNumbers, wordWrap, frontmatterOffset]);

    // Handle incoming value changes
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

    useEffect(() => {
      // Theme changes handled by CSS vars
    }, [themeId]);

    // Context Menu Handler
    async function handleContextMenu(e: MouseEvent) {
      if (!viewRef.current) return;
      e.preventDefault();
      const view = viewRef.current;
      const context = getEditorContext(view);
      const model = buildContextMenu(context, commandRegistry);

      // Check for spellcheck suggestions
      const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
      if (pos !== null) {
        // Check if we clicked on a misspelling
        // We can check decorations at this position, or just get the word and check it?
        // Checking decorations is reliable if they are up to date.
        // But simply checking the word at cursor is easier and robust.

        const line = view.state.doc.lineAt(pos);
        // Word regex to match the worker's logic (including contractions)
        const wordRegex = /\p{L}+(?:['’]\p{L}+)*/gu;
        let match;
        let clickedWord = null;

        while ((match = wordRegex.exec(line.text)) !== null) {
          const from = line.from + match.index;
          const to = from + match[0].length;
          if (pos >= from && pos <= to) {
            clickedWord = match[0];
            break;
          }
        }

        if (clickedWord) {
            // Check if it's actually misspelled?
            // Ideally we ask the worker. But for speed, we might want to just ask for suggestions.
            // If it returns suggestions, it's likely misspelled or at least has alternatives.
            // But we only want to show suggestions if it is flagged as misspelled.

            // To be precise, we should check if there is a 'cm-misspelling' decoration at this position.
            // But accessing decoration set from outside the plugin is tricky without exporting it.
            // Let's just ask spellcheckCore if it's misspelled (or just get suggestions).
            // If we get suggestions, we show them.

            // Wait, we need to know if we should show the "Add to dictionary" option.
            // Assuming if we get suggestions, we treat it as misspelled.

            // We can do a quick check?
            // spellcheckCore doesn't have a sync check.
            // We'll rely on getSuggestions returning non-empty list OR we just show it.

            const suggestions = await spellcheckCore.getSuggestions(clickedWord);
            if (suggestions.length > 0) {
                 const suggestionItems: MenuItem[] = suggestions.slice(0, 5).map(s => ({
                     id: `spellcheck.suggest.${s}`,
                     label: s,
                     icon: 'Refresh', // Using RefreshIcon as placeholder for "replace"
                     action: () => {
                         if (!viewRef.current || !clickedWord) return;
                         // Replace word
                         const transaction = viewRef.current.state.update({
                             changes: { from: line.from + match!.index, to: line.from + match!.index + clickedWord.length, insert: s }
                         });
                         viewRef.current.dispatch(transaction);
                     }
                 }));

                 const spellcheckSection = {
                     items: [
                         ...suggestionItems,
                         { type: 'separator' } as any,
                         {
                             id: 'spellcheck.add',
                             label: 'Add to dictionary',
                             icon: 'Dictionary',
                             action: () => {
                                 if (clickedWord) {
                                     spellcheckCore.addWord(clickedWord);
                                     window.dispatchEvent(new CustomEvent('liminal-spellcheck-add', { detail: { word: clickedWord } }));
                                 }
                             }
                         },
                         {
                             id: 'spellcheck.ignore',
                             label: 'Ignore word',
                             icon: 'Ban',
                             action: () => {
                                  if (clickedWord) {
                                      window.dispatchEvent(new CustomEvent('liminal-spellcheck-ignore', { detail: { word: clickedWord } }));
                                  }
                             }
                         },
                     ]
                 };

                 // Prepend to model
                 model.sections.unshift(spellcheckSection);
            }
        }
      }

      setContextMenu({ model, position: { x: e.clientX, y: e.clientY } });
    }

    useEffect(() => {
      const editorEl = viewRef.current?.dom;
      if (!editorEl) return;
      editorEl.addEventListener('contextmenu', handleContextMenu);
      return () => {
        editorEl.removeEventListener('contextmenu', handleContextMenu);
      };
    }, [noteId, path]);

    async function handleMenuItemClick(commandId: string, action?: () => void) {
      // If item has a direct action (like spellcheck suggestions), use it
      if (action) {
          action();
          viewRef.current?.focus();
          return;
      }

      if (!viewRef.current) return;
      try {
        const context = getEditorContext(viewRef.current);
        await commandRegistry.executeCommand(commandId, context);
        viewRef.current.focus();
      } catch (e) {
        console.error("Failed to execute command from menu:", e);
      }
    }

    return (
      <>
        <div
            ref={editorRef}
            style={{ height: '100%', width: '100%' }}
            className={`cm-editor-container ${readableLineLength ? 'readable-line-length' : ''}`}
        />

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
