import type { NoteId } from '@liminal-notes/core-shared/types';

/**
 * Normalizes a note path by replacing backslashes with forward slashes
 * and removing leading slashes.
 *
 * @param input - The raw path string.
 * @returns The normalized path.
 */
export function normalizeNotePath(input: string): string {
  // Replace backslashes with forward slashes
  let path = input.replace(/\\/g, '/');

  // Remove leading slashes (making it relative)
  path = path.replace(/^\/+/, '');

  // Remove ./ prefix if present
  path = path.replace(/^\.\//, '');

  return path;
}

/**
 * Asserts that a note path is safe (relative, no '..', no null bytes).
 * Throws an error if the path is unsafe.
 *
 * @param input - The path to validate.
 * @returns The validated NoteId (string alias).
 */
export function assertSafeNotePath(input: string): NoteId {
  if (!input || input.trim() === '') {
    throw new Error('Path cannot be empty');
  }

  if (input.includes('\0')) {
    throw new Error('Path cannot contain null bytes');
  }

  // Check for Windows absolute paths (e.g., C:/...)
  if (/^[a-zA-Z]:/.test(input)) {
    throw new Error('Path cannot be absolute');
  }

  // Check for POSIX absolute paths (starting with /)
  // We check this BEFORE normalizeNotePath strips them
  if (input.startsWith('/') || input.startsWith('\\')) {
    throw new Error('Path cannot be absolute');
  }

  // Normalize to check for traversal
  const normalized = normalizeNotePath(input);

  // Check for directory traversal segments
  const parts = normalized.split('/');
  for (const part of parts) {
    if (part === '..') {
      throw new Error(`Path contains invalid segment '..'`);
    }
  }

  // Since we stripped leading slashes in normalize, we don't need to check for absolute paths here
  // effectively, but we should ensure the original didn't try to trick us?
  // normalizeNotePath handles leading slashes by stripping them, which is the desired behavior for vault-relative paths.

  return normalized;
}

/**
 * Joins path parts into a single normalized path using forward slashes.
 *
 * @param parts - The path segments to join.
 * @returns The joined path.
 */
export function joinNotePath(...parts: string[]): string {
  const raw = parts.join('/');
  return normalizeNotePath(raw);
}
