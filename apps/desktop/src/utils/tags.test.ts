import { expect, test } from 'vitest';
import { normalizeTagId, deriveTagsFromPath } from './tags';

test('normalizeTagId', () => {
    expect(normalizeTagId('Foo Bar')).toBe('foo-bar');
    expect(normalizeTagId('foo_bar')).toBe('foo-bar');
    expect(normalizeTagId('  Mixed   CASE  ')).toBe('mixed-case');
    expect(normalizeTagId('symbols!@#')).toBe('symbols');
    expect(normalizeTagId('multiple---dashes')).toBe('multiple-dashes');
});

test('deriveTagsFromPath', () => {
    expect(deriveTagsFromPath('folder/sub/note.md')).toEqual(['folder', 'sub']);
    expect(deriveTagsFromPath('note.md')).toEqual([]);
    expect(deriveTagsFromPath('Folder A/Folder_B/note.md')).toEqual(['folder-a', 'folder-b']);
});
