import { EditorView, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { EditorState, Annotation } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands';
import { closeBrackets } from '@codemirror/autocomplete';
import { keymap } from '@codemirror/view';
import { GFM } from '@lezer/markdown';

import {
  PROTOCOL_VERSION,
  EditorCommand,
  EditorEvent,
  AnyMessage,
  MessageKind,
} from '@liminal-notes/core-shared/mobile/editorProtocol';

import { createEditorTheme, fallbackThemeVars } from './theme';
import { send, listen } from './bridge';

// -- Editor Initialization --

let editorView: EditorView | null = null;
let currentDocId: string | null = null;
let currentRevision = 0;

// Annotation to mark programmatic changes from the host
const HostTransaction = Annotation.define<boolean>();

// Apply theme vars to document root
function applyTheme(vars: Record<string, string>) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

// Apply fallback theme initially to prevent FOUC (Flash of Unstyled Content) if possible, or just wait for init
applyTheme(fallbackThemeVars);

function initEditor(parent: HTMLElement) {
  const extensions = [
    lineNumbers(),
    highlightActiveLine(),
    history(),
    closeBrackets(),
    EditorView.lineWrapping,
    markdown({ extensions: [GFM] }),
    createEditorTheme(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    EditorView.updateListener.of((update) => {
      // Ignore transactions marked as coming from the host
      if (update.transactions.some(tr => tr.annotation(HostTransaction))) {
        return;
      }

      if (update.docChanged && currentDocId) {
        currentRevision++;

        // We need to emit changes so that the host can apply them sequentially.
        // If a transaction has multiple changes (e.g. multi-cursor or replace-all),
        // `iterChanges` gives us the changes relative to the START of the transaction (ChangeSet A -> B).
        // The host expects revisions N, N+1... which implies sequential application.
        // Therefore, we must map the 'from' positions of subsequent changes in the set to account for previous insertions/deletions.

        let offset = 0;

        update.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
           // fromA/toA are relative to the doc at the start of transaction.
           // When sending multiple messages, we are simulating multiple transactions/revisions.
           // The first change applies to Doc A.
           // The second change applies to Doc A + Change 1.
           // So we need to shift the second change's 'from' by the size delta of Change 1.

           const insertedText = inserted.toString();
           const delta = insertedText.length - (toA - fromA);

           send({
              type: EditorEvent.Changed,
              payload: {
                  docId: currentDocId!,
                  revision: currentRevision,
                  change: {
                      from: fromA + offset,
                      to: toA + offset,
                      insertedText: insertedText
                  }
              }
           });

           // Apply delta to offset for the next change in this batch
           offset += delta;

           // Increment revision for the "virtual" next transaction
           // Note: The host expects strict monotonic revisions. If we emit 3 changes, we should ideally increment revision 3 times.
           // But `currentRevision` was only incremented once per transaction above.
           // Let's adjust it.
           if (offset !== delta) {
               // This means we are on the 2nd or later change in the loop
               currentRevision++;
           }
        });
      }
    })
  ];

  const state = EditorState.create({
    doc: '',
    extensions
  });

  editorView = new EditorView({
    state,
    parent
  });
}

// -- Command Handling --

function handleCommand(msg: AnyMessage) {
  if (msg.kind !== MessageKind.Cmd) return;

  switch (msg.type) {
    case EditorCommand.Init:
      // Apply theme
      if (msg.payload.theme && msg.payload.theme.vars) {
        applyTheme(msg.payload.theme.vars);
      }
      break;

    case EditorCommand.Set:
      if (!editorView) return;
      currentDocId = msg.payload.docId;
      currentRevision = 0; // Reset revision for new doc

      editorView.dispatch({
        changes: { from: 0, to: editorView.state.doc.length, insert: msg.payload.text },
        selection: msg.payload.selection ? { anchor: msg.payload.selection.anchor, head: msg.payload.selection.head } : { anchor: 0 },
        annotations: HostTransaction.of(true)
      });
      break;

    case EditorCommand.RequestState:
      if (!editorView) return;
      const state = editorView.state;
      const response: any = {
        requestId: msg.payload.requestId,
        state: {}
      };

      if (msg.payload.include.includes('text')) {
        response.state.text = state.doc.toString();
      }
      if (msg.payload.include.includes('selection')) {
        response.state.selection = {
            anchor: state.selection.main.anchor,
            head: state.selection.main.head
        };
      }
      if (msg.payload.include.includes('scroll')) {
          // Scroll handling might require DOM access or a ViewUpdate,
          // but for now we can approximate or ignore if not critical.
          // EditorView.scrollDOM.scrollTop?
          // Using 0 for now as placeholder unless we need exact scroll syncing immediately.
          response.state.scroll = 0;
      }

      send({
        type: EditorEvent.RequestResponse,
        payload: response
      });
      break;

    default:
      console.warn('[editor-bridge] Unknown command', msg);
  }
}

// -- Event Listeners --

listen(handleCommand);

// Main boot
const editorEl = document.getElementById('editor');
if (editorEl) {
    editorEl.innerHTML = ''; // Clear loading text
    initEditor(editorEl);

    // Signal Ready
    send({
        type: EditorEvent.Ready,
        payload: {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {
                links: true, // We have basic link highlighting via GFM
                selection: true
            }
        }
    });
}
