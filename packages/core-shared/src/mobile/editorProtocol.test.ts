import { describe, it, expect } from 'vitest';
import {
  parseMessage,
  createMessage,
  EditorCommand,
  EditorEvent,
  MessageKind,
  PROTOCOL_VERSION
} from './editorProtocol';

describe('Editor Protocol', () => {
  it('should parse a valid Init command', () => {
    const raw = JSON.stringify({
      v: 1,
      id: '123',
      kind: 'cmd',
      type: 'editor/init',
      payload: {
        platform: 'ios',
        readOnly: false,
        theme: { name: 'dark', vars: {} },
        featureFlags: { links: true }
      }
    });

    const result = parseMessage(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.type).toBe(EditorCommand.Init);
      expect(result.data.payload.platform).toBe('ios');
    }
  });

  it('should parse a valid DocChanged event', () => {
    const raw = {
      v: 1,
      id: 'abc',
      kind: 'evt',
      type: 'doc/changed',
      payload: {
        docId: 'note-1',
        revision: 10,
        change: { from: 0, to: 0, insertedText: 'hello' }
      }
    };

    const result = parseMessage(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.type).toBe(EditorEvent.Changed);
    }
  });

  it('should reject invalid version', () => {
    const raw = {
      v: 2, // Invalid
      id: 'abc',
      kind: 'cmd',
      type: 'editor/init',
      payload: {}
    };

    const result = parseMessage(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // We expect the error path to point to 'v'
      expect(result.error.issues[0].path).toEqual(['v']);
    }
  });

  it('should reject missing id', () => {
    const raw = {
      v: 1,
      // id missing
      kind: 'cmd',
      type: 'editor/init',
      payload: {}
    };
    const result = parseMessage(raw);
    expect(result.ok).toBe(false);
  });

  it('should reject empty id', () => {
    const raw = {
      v: 1,
      id: '',
      kind: 'cmd',
      type: 'editor/init',
      payload: {}
    };
    const result = parseMessage(raw);
    expect(result.ok).toBe(false);
  });

  it('should reject unknown message type', () => {
    const raw = {
      v: 1,
      id: '123',
      kind: 'cmd',
      type: 'unknown/command',
      payload: {}
    };
    const result = parseMessage(raw);
    expect(result.ok).toBe(false);
  });

  it('should reject invalid payload structure', () => {
    const raw = {
      v: 1,
      id: '123',
      kind: 'cmd',
      type: 'editor/init',
      payload: {
        platform: 'windows', // invalid enum
        readOnly: false
      }
    };
    const result = parseMessage(raw);
    expect(result.ok).toBe(false);
  });

  it('createMessage should validate input', () => {
    expect(() => {
      createMessage({
        v: 1,
        id: '123',
        kind: MessageKind.Cmd,
        type: EditorCommand.Init,
        payload: {
          platform: 'ios',
          // @ts-ignore
          readOnly: 'invalid_boolean'
        } as any
      });
    }).toThrow();
  });
});
