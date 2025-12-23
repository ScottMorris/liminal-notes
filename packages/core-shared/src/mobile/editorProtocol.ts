// Protocol version
export const PROTOCOL_VERSION = 1;

// Message kinds
export enum MessageKind {
  Cmd = 'cmd',
  Evt = 'evt',
  Ack = 'ack',
  Err = 'err'
}

// Envelope structure
export interface Envelope<T = unknown> {
  v: number;
  id: string;
  kind: MessageKind;
  type: string;
  payload: T;
}

// -- Commands (RN -> WebView) --

export enum EditorCommand {
  Init = 'editor/init',
  Set = 'doc/set',
  RequestState = 'request/state'
}

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

export enum EditorEvent {
  Ready = 'editor/ready',
  Changed = 'doc/changed',
  LinkClicked = 'link/clicked',
  RequestResponse = 'request/response'
}

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
  | { type: EditorCommand.Init; payload: InitPayload }
  | { type: EditorCommand.Set; payload: DocSetPayload }
  | { type: EditorCommand.RequestState; payload: RequestStatePayload };

export type EventType =
  | { type: EditorEvent.Ready; payload: ReadyPayload }
  | { type: EditorEvent.Changed; payload: DocChangedPayload }
  | { type: EditorEvent.LinkClicked; payload: LinkClickedPayload }
  | { type: EditorEvent.RequestResponse; payload: RequestResponsePayload };
