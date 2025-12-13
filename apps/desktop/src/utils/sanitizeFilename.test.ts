import { describe, it, expect } from 'vitest';
import { sanitizeFilename } from './sanitizeFilename';

describe('sanitizeFilename', () => {
  it('should remove illegal characters', () => {
    expect(sanitizeFilename('file<name>')).toBe('filename');
    expect(sanitizeFilename('file:name')).toBe('filename');
    expect(sanitizeFilename('file"name"')).toBe('filename');
    expect(sanitizeFilename('file/name')).toBe('filename');
    expect(sanitizeFilename('file\\name')).toBe('filename');
    expect(sanitizeFilename('file|name')).toBe('filename');
    expect(sanitizeFilename('file?name')).toBe('filename');
    expect(sanitizeFilename('file*name')).toBe('filename');
  });

  it('should replace spaces with dashes', () => {
    expect(sanitizeFilename('my cool note')).toBe('my-cool-note');
    expect(sanitizeFilename('multiple   spaces')).toBe('multiple-spaces');
  });

  it('should remove leading dots', () => {
    expect(sanitizeFilename('.hidden')).toBe('hidden');
    expect(sanitizeFilename('..hidden')).toBe('hidden');
    expect(sanitizeFilename('file.md')).toBe('file.md'); // Internal dot ok
  });

  it('should truncate long filenames', () => {
    const longName = 'a'.repeat(300);
    expect(sanitizeFilename(longName).length).toBe(255);
  });

  it('should handle combination of issues', () => {
      expect(sanitizeFilename(' .My <Cool> Note? ')).toBe('My-Cool-Note');
  });
});
