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
        });
      }
    }, [value]);

    // Handle Theme Changes
    useEffect(() => {
      // Since we use CSS variables in our theme definition, styles update automatically.
      // We keep this effect hook in case future theme requirements need explicit JS reconfiguration.
    }, [themeId]);

    return <div ref={editorRef} style={{ height: '100%', width: '100%' }} className="cm-editor-container" />;
  }
);

CodeMirrorEditor.displayName = 'CodeMirrorEditor';
