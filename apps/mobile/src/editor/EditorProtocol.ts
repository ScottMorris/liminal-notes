import {
  PROTOCOL_VERSION,
  Envelope,
  MessageKind,
  CommandType,
  EventType,
  EditorCommand,
  EditorEvent,
  InitPayload,
  DocSetPayload,
  RequestStatePayload,
  ReadyPayload,
  DocChangedPayload,
  LinkClickedPayload,
  RequestResponsePayload,
  createMessage,
  parseMessage,
  AnyMessage
} from '@liminal-notes/core-shared/mobile/editorProtocol';

export type {
  Envelope,
  CommandType,
  EventType,
  InitPayload,
  DocSetPayload,
  RequestStatePayload,
  ReadyPayload,
  DocChangedPayload,
  LinkClickedPayload,
  RequestResponsePayload,
  AnyMessage
};

export {
  MessageKind,
  EditorCommand,
  EditorEvent,
  createMessage
}

export class ProtocolError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'ProtocolError';
  }
}

/**
 * Creates a command envelope to send to the WebView.
 * Wraps the shared createMessage for specific command typing convenience.
 */
export function createCommand<T extends CommandType>(
  type: T['type'],
  payload: T['payload']
): Envelope<T['payload']> {
  const envelope = {
    v: PROTOCOL_VERSION,
    id: generateUUID(),
    kind: MessageKind.Cmd,
    type,
    payload,
  } as AnyMessage; // Cast to AnyMessage to satisfy createMessage check

  // Validate using strict schema
  return createMessage(envelope) as Envelope<T['payload']>;
}

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Parses and validates an incoming envelope from the WebView.
 * Uses strict Zod schema validation.
 */
export function parseEnvelope(data: string | unknown): AnyMessage {
  const result = parseMessage(data);

  if (!result.ok) {
    // Map Zod errors to ProtocolError for backward compatibility/consistent error handling in app
    throw new ProtocolError('Message validation failed', {
      data,
      issues: result.error.issues,
      raw: result.raw
    });
  }

  return result.data;
}

/**
 * Type guard for specific events.
 */
export function isEvent<T extends EventType>(
  envelope: AnyMessage | Envelope<unknown>,
  type: T['type']
): envelope is Envelope<T['payload']> {
  return envelope.kind === MessageKind.Evt && envelope.type === type;
}
