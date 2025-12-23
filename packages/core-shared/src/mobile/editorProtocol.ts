// Protocol version
export const PROTOCOL_VERSION = 1;

// Message kinds
export type MessageKind = 'cmd' | 'evt' | 'ack' | 'err';

// Envelope structure
export interface Envelope<T = unknown> {
  v: number;
  id: string;
  kind: MessageKind;
  type: string;
  payload: T;
}

// -- Commands (RN -> WebView) --

export interface InitPayload {
  platform: 'android' | 'ios';
  readOnly: boolean;
  theme: {
    name: string;
    vars: Record<string, string>;
  };
  featureFlags: {
    links: boolean;
  };
}

export interface DocSetPayload {
  docId: string;
  text: string;
  selection?: {
    anchor: number;
    head: number;
  };
}

export interface RequestStatePayload {
  requestId: string;
  include: ('text' | 'selection' | 'scroll')[];
}

// -- Events (WebView -> RN) --

export interface ReadyPayload {
  protocolVersion: number;
  capabilities: {
    links: boolean;
    selection: boolean;
  };
}

export interface DocChangedPayload {
  docId: string;
  revision: number;
  change: {
    from: number;
    to: number;
    insertedText: string;
  };
}

export interface LinkClickedPayload {
  docId: string;
  kind: 'wikilink' | 'url' | 'file';
  href: string;
  text: string;
}

export interface RequestResponsePayload {
  requestId: string;
  state: {
    text?: string;
    selection?: { anchor: number; head: number };
    scroll?: number;
  };
}

// -- Error --

export interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

// Union types for strict typing if needed
export type CommandType =
  | { type: 'editor/init'; payload: InitPayload }
  | { type: 'doc/set'; payload: DocSetPayload }
  | { type: 'request/state'; payload: RequestStatePayload };

export type EventType =
  | { type: 'editor/ready'; payload: ReadyPayload }
  | { type: 'doc/changed'; payload: DocChangedPayload }
  | { type: 'link/clicked'; payload: LinkClickedPayload }
  | { type: 'request/response'; payload: RequestResponsePayload };
