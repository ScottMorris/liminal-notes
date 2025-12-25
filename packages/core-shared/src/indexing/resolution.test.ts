import { describe, it, expect } from 'vitest';
import { resolveWikilinkTarget } from './resolution';

describe('resolveWikilinkTarget', () => {
  const existingNoteIds = [
    'root.md',
    'folder/nested.md',
    'folder/sub/deep.md',
    'folder/duplicate.md',
    'other/duplicate.md'
  ];

  it('resolves exact root match', () => {
    expect(resolveWikilinkTarget('root', { existingNoteIds })).toBe('root.md');
    expect(resolveWikilinkTarget('root.md', { existingNoteIds })).toBe('root.md');
  });

  it('resolves nested file by unique basename', () => {
    expect(resolveWikilinkTarget('nested', { existingNoteIds })).toBe('folder/nested.md');
    expect(resolveWikilinkTarget('deep', { existingNoteIds })).toBe('folder/sub/deep.md');
  });

  it('resolves explicit relative path', () => {
    expect(resolveWikilinkTarget('folder/nested', { existingNoteIds })).toBe('folder/nested.md');
    expect(resolveWikilinkTarget('folder/nested.md', { existingNoteIds })).toBe('folder/nested.md');
  });

  it('resolves explicit relative path that does not exist', () => {
    expect(resolveWikilinkTarget('folder/nonexistent', { existingNoteIds })).toBeNull();
  });

  it('resolves ambiguous basename deterministically (lexicographical sort)', () => {
    // 'duplicate' matches 'folder/duplicate.md' and 'other/duplicate.md'
    // 'folder/duplicate.md' comes first alphabetically
    expect(resolveWikilinkTarget('duplicate', { existingNoteIds })).toBe('folder/duplicate.md');
  });

  it('returns null for unresolved basename', () => {
    expect(resolveWikilinkTarget('missing', { existingNoteIds })).toBeNull();
  });

  it('handles mixed slashes if exact match exists (assuming input matches storage format)', () => {
    // If the storage uses forward slashes, input must match or we'd need normalization logic.
    // The current implementation relies on string equality or endsWith.
    expect(resolveWikilinkTarget('folder/nested.md', { existingNoteIds })).toBe('folder/nested.md');
  });
});
