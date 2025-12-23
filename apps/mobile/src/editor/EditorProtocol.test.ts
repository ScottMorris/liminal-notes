import { describe, it, expect } from 'vitest';
import { createCommand, parseEnvelope, isEvent, MessageKind, EditorEvent, EditorCommand } from './EditorProtocol';

describe('EditorProtocol', () => {
  it('creates valid command envelopes', () => {
    const payload = {
      platform: 'ios' as const,
      readOnly: false,
      theme: { name: 'light', vars: {} },
      featureFlags: { links: true }
    };

    const cmd = createCommand(EditorCommand.Init, payload);

    expect(cmd.v).toBe(1);
    expect(cmd.kind).toBe(MessageKind.Cmd);
    expect(cmd.type).toBe(EditorCommand.Init);
    expect(cmd.payload).toEqual(payload);
    expect(cmd.id).toBeDefined();
  });

  it('parses valid string messages', () => {
    const json = JSON.stringify({
      v: 1,
      id: 'abc',
      kind: MessageKind.Evt,
      type: EditorEvent.Ready,
      payload: { protocolVersion: 1, capabilities: { links: true, selection: true } }
    });

    const envelope = parseEnvelope(json);
    expect(envelope.kind).toBe(MessageKind.Evt);
    expect(envelope.type).toBe(EditorEvent.Ready);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseEnvelope('invalid')).toThrow('Failed to parse message JSON');
  });

  it('throws on missing fields', () => {
    const invalid = JSON.stringify({ v: 1 });
    expect(() => parseEnvelope(invalid)).toThrow('Message missing required fields');
  });

  it('identifies event types correctly', () => {
    const envelope = {
      v: 1,
      id: '123',
      kind: MessageKind.Evt,
      type: EditorEvent.Changed,
      payload: { docId: '1', revision: 2, change: { from: 0, to: 0, insertedText: 'a' } }
    };

    expect(isEvent(envelope, EditorEvent.Changed)).toBe(true);
    expect(isEvent(envelope, EditorEvent.Ready)).toBe(false);
  });
});
