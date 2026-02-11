import { describe, expect, it, vi } from 'vitest';
import { resolveNavigablePath } from './navigationPath';

describe('resolveNavigablePath', () => {
  it('resolves extension-less targets to canonical markdown paths', () => {
    const resolvePath = vi.fn().mockReturnValue('folder/note.md');

    expect(resolveNavigablePath('folder/note', resolvePath)).toBe('folder/note.md');
    expect(resolvePath).toHaveBeenCalledWith('folder/note');
  });

  it('keeps markdown paths unchanged', () => {
    const resolvePath = vi.fn();

    expect(resolveNavigablePath('folder/note.md', resolvePath)).toBe('folder/note.md');
    expect(resolvePath).not.toHaveBeenCalled();
  });

  it('falls back to trimmed path when resolver has no match', () => {
    const resolvePath = vi.fn().mockReturnValue(undefined);

    expect(resolveNavigablePath(' note-without-extension ', resolvePath)).toBe('note-without-extension');
    expect(resolvePath).toHaveBeenCalledWith('note-without-extension');
  });
});
