import {
  PROTOCOL_VERSION,
  Envelope,
  MessageKind,
  CommandType,
  EventType,
  InitPayload,
  DocSetPayload,
  RequestStatePayload,
  ReadyPayload,
  DocChangedPayload,
  LinkClickedPayload,
  RequestResponsePayload
} from '@liminal-notes/core-shared/src/mobile/editorProtocol';

export type {
  Envelope,
  MessageKind,
  CommandType,
  EventType,
  InitPayload,
  DocSetPayload,
  RequestStatePayload,
  ReadyPayload,
  DocChangedPayload,
  LinkClickedPayload,
  RequestResponsePayload
};

export class ProtocolError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'ProtocolError';
  }
}

/**
 * Creates a command envelope to send to the WebView.
 */
export function createCommand<T extends CommandType>(
  type: T['type'],
  payload: T['payload']
): Envelope<T['payload']> {
  return {
    v: PROTOCOL_VERSION,
    id: generateUUID(),
    kind: 'cmd',
    type,
    payload,
  };
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
 */
export function parseEnvelope(data: string | unknown): Envelope<unknown> {
  let envelope: any;
  if (typeof data === 'string') {
    try {
      envelope = JSON.parse(data);
    } catch (e) {
      throw new ProtocolError('Failed to parse message JSON', { data, error: e });
    }
  } else {
    envelope = data;
  }

  if (typeof envelope !== 'object' || envelope === null) {
    throw new ProtocolError('Message is not an object', { envelope });
  }

  if (envelope.v !== PROTOCOL_VERSION) {
    console.warn(`Protocol version mismatch: expected ${PROTOCOL_VERSION}, got ${envelope.v}`);
  }

  if (!envelope.id || !envelope.kind || !envelope.type) {
    throw new ProtocolError('Message missing required fields (id, kind, type)', { envelope });
  }

  return envelope as Envelope<unknown>;
}

/**
 * Type guard for specific events.
 */
export function isEvent<T extends EventType>(
  envelope: Envelope<unknown>,
  type: T['type']
): envelope is Envelope<T['payload']> {
  return envelope.kind === 'evt' && envelope.type === type;
}
