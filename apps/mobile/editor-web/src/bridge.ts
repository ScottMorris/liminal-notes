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
 * Waits for the React Native bridge to be injected.
 * @param timeoutMs Max time to wait (default 5000ms)
 * @returns Promise that resolves true if bridge is found, false otherwise
 */
export function waitForBridge(timeoutMs = 5000): Promise<boolean> {
    return new Promise((resolve) => {
        // @ts-ignore
        if (window.ReactNativeWebView) {
            resolve(true);
            return;
        }

        const start = Date.now();
        const interval = setInterval(() => {
            // @ts-ignore
            if (window.ReactNativeWebView) {
                clearInterval(interval);
                resolve(true);
            } else if (Date.now() - start > timeoutMs) {
                clearInterval(interval);
                console.error('[editor-bridge] Timed out waiting for ReactNativeWebView');
                resolve(false);
            }
        }, 100);
    });
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
