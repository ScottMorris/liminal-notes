import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { closeBrackets } from '@codemirror/autocomplete';
import { createEditorTheme } from './editorTheme';
import { useTheme } from '../../theme';

export interface EditorHandle {
  insertAtCursor: (text: string) => void;
  focus: () => void;
}

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
}

export const CodeMirrorEditor = forwardRef<EditorHandle, CodeMirrorEditorProps>(
  ({ value, onChange, onSave }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const { themeId } = useTheme();

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
    }));

    // Initialize Editor
    useEffect(() => {
      if (!editorRef.current) return;

      const state = EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          history(),
          closeBrackets(),
          markdown(),
          createEditorTheme(),
          keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            {
              key: 'Mod-s',
              run: () => {
                onSave();
                return true;
              },
            },
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChange(update.state.doc.toString());
            }
          }),
        ],
      });

      const view = new EditorView({
        state,
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
          // Reset history on full content replace (usually a new note) might be desired,
          // but for now we just replace content.
          // If this is a new note load, we might want to reset history, but if it's external update...
          // For now, let's just replace.
        });
      }
    }, [value]);

    // Handle Theme Changes
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;

      // Reconfigure the theme extension
      // We simply dispatch a transaction to update the theme by re-creating the extension
      // Since we use CSS variables, the main colors update automatically,
      // but if the structure of `createEditorTheme` depended on JS variables we would need to reconfigure.
      // However, `createEditorTheme` uses `var(...)` so it might just work without reconfigure?
      // Actually, CodeMirror compiles the theme to classes.
      // Since we are using CSS variables inside the theme definition, the *values* will update automatically
      // as long as the CSS variables in the body/root change.
      // BUT, if `createEditorTheme` is called once, it generates static CSS classes referring to those variables.
      // So effectively, we might not need to do anything here if `createEditorTheme` is purely CSS variable based!

      // Let's verify: `createEditorTheme` returns `EditorView.theme({...})`.
      // This creates a unique class for the scope. Inside it has rules like `color: var(--ln-editor-fg)`.
      // When `themeId` changes, `ThemeProvider` updates the style attribute on `html` or `body`.
      // The CSS variables update. The CodeMirror styles should resolve to the new values immediately.

      // So strictly speaking, we might not need an effect here unless we want to force a layout update
      // or if we have logic that changes the *structure* of the theme based on ID.
      // Currently we don't.

      // However, to be safe and future-proof (e.g. if we switch to specific JS values later),
      // we can use a compartment, but given the current plan uses CSS vars, it should be automatic.
      // I'll leave this empty for now but keep the hook.

    }, [themeId]);

    return <div ref={editorRef} style={{ height: '100%', width: '100%' }} className="cm-editor-container" />;
  }
);

CodeMirrorEditor.displayName = 'CodeMirrorEditor';
