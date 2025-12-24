// Import protocol types from core-shared
import {
  PROTOCOL_VERSION,
  EventType,
  MessageKind,
  EditorCommand,
  EditorEvent,
  parseMessage,
  createMessage,
  AnyMessage
} from '@liminal-notes/core-shared/mobile/editorProtocol';

// Helper to send messages to RN
function send(msg: EventType) {
  // We construct the envelope using the createMessage helper indirectly,
  // or at least construct a valid object that matches the schema.

  const envelope: AnyMessage = {
    v: PROTOCOL_VERSION,
    id: globalThis.crypto?.randomUUID() || Math.random().toString(36).slice(2),
    kind: MessageKind.Evt,
    type: msg.type,
    // @ts-ignore - TS discrimination might be tricky here with generic 'msg', but AnyMessage schema will validate at runtime
    payload: msg.payload
  } as AnyMessage;

  // Validate before sending
  try {
    createMessage(envelope);
  } catch (e) {
    console.error('[editor-bridge] Failed to create valid outbound message', e);
    return;
  }

  // @ts-ignore: ReactNativeWebView is injected by the host and not present in standard DOM types
  if (window.ReactNativeWebView) {
     // @ts-ignore: ReactNativeWebView is injected by the host and not present in standard DOM types
    window.ReactNativeWebView.postMessage(JSON.stringify(envelope));
  } else {
    console.warn('[editor-bridge] ReactNativeWebView not found', envelope);
  }
}

function handleCommand(msg: AnyMessage) {
  // Narrowing based on kind first
  if (msg.kind !== MessageKind.Cmd) {
    // We only handle commands
    return;
  }

  const editorEl = document.getElementById('editor');

  switch (msg.type) {
    case EditorCommand.Init:
      if (editorEl) editorEl.innerText = `Initialized (${msg.payload.platform})`;
      break;
    case EditorCommand.Set:
      if (editorEl) editorEl.innerText = msg.payload.text;
      break;
    case EditorCommand.RequestState:
      send({
        type: EditorEvent.RequestResponse,
        payload: {
          requestId: msg.payload.requestId,
          state: {
            text: editorEl?.innerText || ''
          }
        }
      });
      break;
    default:
      console.warn('[editor-bridge] Unknown or unhandled command', msg);
  }
}

// Listen for messages from RN
// We listen on document to match the dispatch event from EditorView
document.addEventListener('message', (event: any) => {
  const result = parseMessage(event.data);

  if (result.ok) {
    handleCommand(result.data);
  } else {
    console.error('[editor-bridge] Invalid message received', {
      issues: result.error.issues,
      raw: typeof event.data === 'string' ? event.data.slice(0, 200) : 'object'
    });
  }
});

// Signal ready
send({
  type: EditorEvent.Ready,
  payload: {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {
      links: true,
      selection: true
    }
  }
});
