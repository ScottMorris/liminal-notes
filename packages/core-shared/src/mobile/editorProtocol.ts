import { z } from 'zod';

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
  Execute = 'editor/execute',
  RequestState = 'request/state'
}

export interface ExecutePayload {
  id: string;
}

export const ExecutePayloadSchema = z.object({
  id: z.string()
});

export interface InitPayload {
  platform: 'android' | 'ios';
  readOnly: boolean;
  theme: {
    name: string;
    vars: Record<string, string>;
  };
  settings?: {
    showLineNumbers: boolean;
    highlightActiveLine: boolean;
    wordWrap: boolean;
    showFrontmatter?: boolean;
  };
  featureFlags: {
    links: boolean;
  };
}

export const InitPayloadSchema = z.object({
  platform: z.enum(['android', 'ios']),
  readOnly: z.boolean(),
  theme: z.object({
    name: z.string(),
    vars: z.record(z.string(), z.string())
  }),
  settings: z.object({
    showLineNumbers: z.boolean(),
    highlightActiveLine: z.boolean(),
    wordWrap: z.boolean(),
    showFrontmatter: z.boolean().optional()
  }).optional(),
  featureFlags: z.object({
    links: z.boolean()
  })
});

export interface DocSetPayload {
  docId: string;
  text: string;
  selection?: {
    anchor: number;
    head: number;
  };
}

export const DocSetPayloadSchema = z.object({
  docId: z.string(),
  text: z.string(),
  selection: z.object({
    anchor: z.number(),
    head: z.number()
  }).optional()
});

export interface RequestStatePayload {
  requestId: string;
  include: ('text' | 'selection' | 'scroll')[];
}

export const RequestStatePayloadSchema = z.object({
  requestId: z.string(),
  include: z.array(z.enum(['text', 'selection', 'scroll']))
});

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

export const ReadyPayloadSchema = z.object({
  protocolVersion: z.number(),
  capabilities: z.object({
    links: z.boolean(),
    selection: z.boolean()
  })
});

export interface DocChangedPayload {
  docId: string;
  revision: number;
  change: {
    from: number;
    to: number;
    insertedText: string;
  };
}

export const DocChangedPayloadSchema = z.object({
  docId: z.string(),
  revision: z.number(),
  change: z.object({
    from: z.number(),
    to: z.number(),
    insertedText: z.string()
  })
});

export interface LinkClickedPayload {
  docId: string;
  kind: 'wikilink' | 'url' | 'file';
  href: string;
  text: string;
}

export const LinkClickedPayloadSchema = z.object({
  docId: z.string(),
  kind: z.enum(['wikilink', 'url', 'file']),
  href: z.string(),
  text: z.string()
});

export interface RequestResponsePayload {
  requestId: string;
  state: {
    text?: string;
    selection?: { anchor: number; head: number };
    scroll?: number;
  };
}

export const RequestResponsePayloadSchema = z.object({
  requestId: z.string(),
  state: z.object({
    text: z.string().optional(),
    selection: z.object({
      anchor: z.number(),
      head: z.number()
    }).optional(),
    scroll: z.number().optional()
  })
});

// -- Error --

export interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export const ErrorPayloadSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional()
});

// Union types for strict typing if needed
export type CommandType =
  | { type: EditorCommand.Init; payload: InitPayload }
  | { type: EditorCommand.Set; payload: DocSetPayload }
  | { type: EditorCommand.Execute; payload: ExecutePayload }
  | { type: EditorCommand.RequestState; payload: RequestStatePayload };

export type EventType =
  | { type: EditorEvent.Ready; payload: ReadyPayload }
  | { type: EditorEvent.Changed; payload: DocChangedPayload }
  | { type: EditorEvent.LinkClicked; payload: LinkClickedPayload }
  | { type: EditorEvent.RequestResponse; payload: RequestResponsePayload };

// Full Discriminated Schema

const BaseEnvelope = z.object({
  v: z.literal(PROTOCOL_VERSION),
  id: z.string().min(1)
});

const InitCommandEnvelope = BaseEnvelope.extend({
  kind: z.literal(MessageKind.Cmd),
  type: z.literal(EditorCommand.Init),
  payload: InitPayloadSchema
});

const SetCommandEnvelope = BaseEnvelope.extend({
  kind: z.literal(MessageKind.Cmd),
  type: z.literal(EditorCommand.Set),
  payload: DocSetPayloadSchema
});

const RequestStateEnvelope = BaseEnvelope.extend({
  kind: z.literal(MessageKind.Cmd),
  type: z.literal(EditorCommand.RequestState),
  payload: RequestStatePayloadSchema
});

const ExecuteCommandEnvelope = BaseEnvelope.extend({
  kind: z.literal(MessageKind.Cmd),
  type: z.literal(EditorCommand.Execute),
  payload: ExecutePayloadSchema
});

const ReadyEventEnvelope = BaseEnvelope.extend({
  kind: z.literal(MessageKind.Evt),
  type: z.literal(EditorEvent.Ready),
  payload: ReadyPayloadSchema
});

const ChangedEventEnvelope = BaseEnvelope.extend({
  kind: z.literal(MessageKind.Evt),
  type: z.literal(EditorEvent.Changed),
  payload: DocChangedPayloadSchema
});

const LinkClickedEnvelope = BaseEnvelope.extend({
  kind: z.literal(MessageKind.Evt),
  type: z.literal(EditorEvent.LinkClicked),
  payload: LinkClickedPayloadSchema
});

const RequestResponseEnvelope = BaseEnvelope.extend({
  kind: z.literal(MessageKind.Evt),
  type: z.literal(EditorEvent.RequestResponse),
  payload: RequestResponsePayloadSchema
});

// Error handling
const ErrorEnvelope = BaseEnvelope.extend({
  kind: z.literal(MessageKind.Err),
  type: z.string(),
  payload: ErrorPayloadSchema
});

export const AnyMessageSchema = z.discriminatedUnion('type', [
  InitCommandEnvelope,
  SetCommandEnvelope,
  RequestStateEnvelope,
  ExecuteCommandEnvelope,
  ReadyEventEnvelope,
  ChangedEventEnvelope,
  LinkClickedEnvelope,
  RequestResponseEnvelope,
]);

// Export ErrorEnvelope type
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;

export type AnyMessage = z.infer<typeof AnyMessageSchema> | ErrorEnvelope;

export type ParseResult =
  | { ok: true; data: AnyMessage }
  | { ok: false; error: z.ZodError; raw: unknown };

export function parseMessage(input: unknown): ParseResult {
  let data = input;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      return {
        ok: false,
        error: new z.ZodError([{
          code: z.ZodIssueCode.custom,
          path: [],
          message: 'Invalid JSON'
        }]),
        raw: input
      };
    }
  }

  // First check version manually to give a clear error
  const vCheck = BaseEnvelope.safeParse(data);
  if (!vCheck.success) {
    return { ok: false, error: vCheck.error, raw: input };
  }

  // Now strict check
  const result = AnyMessageSchema.safeParse(data);
  if (result.success) {
    return { ok: true, data: result.data };
  } else {
    // Check if it's a valid Error message
    const errResult = ErrorEnvelope.safeParse(data);
    if (errResult.success) {
       return { ok: true, data: errResult.data };
    }

    return { ok: false, error: result.error, raw: input };
  }
}

export function createMessage(msg: AnyMessage): AnyMessage {
    // Check for error type first since it's not in the discriminated union
    const errResult = ErrorEnvelope.safeParse(msg);
    if (errResult.success) return errResult.data;

    return AnyMessageSchema.parse(msg);
}
