import {
  PROTOCOL_VERSION,
  parseMessage,
  createMessage,
  AnyMessage,
  MessageKind,
  EventType
} from '@liminal-notes/core-shared/mobile/editorProtocol';

/**
 * Sends a message to the React Native host.
 */
export function send(msg: EventType) {
  // Construct the envelope
  const envelope: AnyMessage = {
    v: PROTOCOL_VERSION,
    id: globalThis.crypto?.randomUUID() || Math.random().toString(36).slice(2),
    kind: MessageKind.Evt,
    type: msg.type,
    payload: msg.payload
  } as AnyMessage;

  try {
    const validated = createMessage(envelope);
    // @ts-ignore: ReactNativeWebView is injected by the host
    if (window.ReactNativeWebView) {
      // @ts-ignore
      window.ReactNativeWebView.postMessage(JSON.stringify(validated));
    } else {
      console.warn('[editor-bridge] ReactNativeWebView not found', validated);
    }
  } catch (e) {
    console.error('[editor-bridge] Failed to create valid outbound message', e);
  }
}

/**
 * Listens for messages from the React Native host.
 * @param handler Function to handle valid incoming messages
 */
export function listen(handler: (msg: AnyMessage) => void) {
  document.addEventListener('message', (event: any) => {
    const result = parseMessage(event.data);
    if (result.ok) {
      handler(result.data);
    } else {
      console.error('[editor-bridge] Invalid message', result);
    }
  });
}
