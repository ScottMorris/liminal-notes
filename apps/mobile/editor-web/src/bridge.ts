// Import protocol types from core-shared
import {
  PROTOCOL_VERSION,
  Envelope,
  CommandType,
  EventType,
  MessageKind,
  EditorCommand,
  EditorEvent
} from '@liminal-notes/core-shared/src/mobile/editorProtocol';

// Helper to send messages to RN
function send(msg: EventType) {
  const envelope: Envelope<any> = {
    v: PROTOCOL_VERSION,
    id: globalThis.crypto?.randomUUID() || Math.random().toString(36).slice(2),
    kind: MessageKind.Evt,
    type: msg.type,
    payload: msg.payload
  };

  // @ts-ignore: ReactNativeWebView is injected by the host and not present in standard DOM types
  if (window.ReactNativeWebView) {
     // @ts-ignore: ReactNativeWebView is injected by the host and not present in standard DOM types
    window.ReactNativeWebView.postMessage(JSON.stringify(envelope));
  } else {
    console.warn('ReactNativeWebView not found', envelope);
  }
}

function handleCommand(cmd: CommandType) {
  const editorEl = document.getElementById('editor');

  switch (cmd.type) {
    case EditorCommand.Init:
      if (editorEl) editorEl.innerText = `Initialized (${cmd.payload.platform})`;
      break;
    case EditorCommand.Set:
      if (editorEl) editorEl.innerText = cmd.payload.text;
      break;
    case EditorCommand.RequestState:
      send({
        type: EditorEvent.RequestResponse,
        payload: {
          requestId: cmd.payload.requestId,
          state: {
            text: editorEl?.innerText || ''
          }
        }
      });
      break;
    default:
      console.log('Unknown command', cmd);
  }
}

// Listen for messages from RN
// We listen on document to match the dispatch event from EditorView
document.addEventListener('message', (event: any) => {
  try {
    const envelope = JSON.parse(event.data);
    handleCommand(envelope);
  } catch (e) {
    console.error('Failed to parse message', e);
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
