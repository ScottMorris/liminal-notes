import {
  PROTOCOL_VERSION,
  parseMessage,
  createMessage,
  AnyMessage,
  MessageKind,
  EventType
} from '@liminal-notes/core-shared/mobile/editorProtocol';
import { v4 as uuidv4 } from 'uuid';

// TODO: Control this via settings injection in the future
const DEBUG = false;

/**
 * Sends a message to the React Native host.
 */
export function send(msg: EventType) {
  if (DEBUG) console.log(`[editor-bridge] Sending message type: ${msg.type}`);
  try {
    if (DEBUG) console.log('[editor-bridge] Generating ID...');
    const uuid = uuidv4();
    if (DEBUG) console.log(`[editor-bridge] ID generated: ${uuid}`);

    // Construct the envelope
    const envelope: AnyMessage = {
      v: PROTOCOL_VERSION,
      id: uuid,
      kind: MessageKind.Evt,
      type: msg.type,
      payload: msg.payload
    } as AnyMessage;
    if (DEBUG) console.log('[editor-bridge] Envelope constructed');

    const validated = createMessage(envelope);
    if (DEBUG) console.log('[editor-bridge] Message validated');

    const msgStr = JSON.stringify(validated);
    if (DEBUG) console.log('[editor-bridge] Message stringified');

    // @ts-ignore: ReactNativeWebView is injected by the host
    if (window.ReactNativeWebView) {
      if (DEBUG) console.log(`[editor-bridge] Posting raw: ${msgStr.substring(0, 200)}...`); // Truncate to avoid huge logs
      // @ts-ignore
      window.ReactNativeWebView.postMessage(msgStr);
      if (DEBUG) console.log('[editor-bridge] PostMessage complete');
    } else {
      console.warn('[editor-bridge] ReactNativeWebView not found', validated);
    }
  } catch (e) {
    // Log error with console.log as well in case console.error is filtered/broken in the bridge
    console.log('[editor-bridge] CRITICAL ERROR in send:', e);
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
