// Import protocol types from core-shared (relative import as per plan)
import {
  PROTOCOL_VERSION,
  Envelope,
  InitPayload,
  DocSetPayload,
  RequestStatePayload,
  CommandType,
  EventType
} from '../../../../packages/core-shared/src/mobile/editorProtocol';

// Helper to send messages to RN
function send(msg: EventType) {
  const envelope: Envelope<any> = {
    v: PROTOCOL_VERSION,
    id: globalThis.crypto?.randomUUID() || Math.random().toString(36).slice(2),
    kind: 'evt',
    type: msg.type,
    payload: msg.payload
  };

  // @ts-ignore
  if (window.ReactNativeWebView) {
     // @ts-ignore
    window.ReactNativeWebView.postMessage(JSON.stringify(envelope));
  } else {
    console.warn('ReactNativeWebView not found', envelope);
  }
}

function handleCommand(cmd: CommandType) {
  const editorEl = document.getElementById('editor');

  switch (cmd.type) {
    case 'editor/init':
      if (editorEl) editorEl.innerText = `Initialized (${cmd.payload.platform})`;
      break;
    case 'doc/set':
      if (editorEl) editorEl.innerText = cmd.payload.text;
      break;
    case 'request/state':
      send({
        type: 'request/response',
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
  type: 'editor/ready',
  payload: {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {
      links: true,
      selection: true
    }
  }
});
