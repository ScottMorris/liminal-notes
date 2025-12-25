import { NoteId } from '../types';

interface ResolveOptions {
  /** List of all existing note paths (NoteIds) in the vault */
  existingNoteIds: NoteId[];
}

/**
 * Resolves a raw wikilink target to a specific note ID (path).
 *
 * Logic:
 * 1. If path separators are present, treat as relative path (checking existence).
 * 2. If basename only:
 *    a. Check exact match at root.
 *    b. Search for any file ending with /{target}.md
 *    c. If multiple, sort paths and pick first (deterministic).
 *
 * @param targetRaw The raw text inside [[...]]
 * @param opts Options including the list of existing notes
 * @returns The resolved NoteId or null if not found
 */
export function resolveWikilinkTarget(targetRaw: string, opts: ResolveOptions): NoteId | null {
  const { existingNoteIds } = opts;
  const pathsSet = new Set(existingNoteIds);

  // 1. If path separators, treat as relative path
  if (targetRaw.includes('/') || targetRaw.includes('\\')) {
    let candidate = targetRaw;
    if (!candidate.endsWith('.md')) {
      candidate += '.md';
    }

    // Normalize slashes for lookup if needed, but existingNoteIds are typically standard paths.
    // Assuming existingNoteIds match the platform/storage convention.
    // Ideally we'd normalize everything to '/', but for now we trust exact match first.

    if (pathsSet.has(candidate)) {
      return candidate;
    }
    return null;
  }

  // 2. Basename matching
  const candidateName = targetRaw.endsWith('.md') ? targetRaw : `${targetRaw}.md`;

  // Check exact match first (if file is in root or exact path given without slash)
  if (pathsSet.has(candidateName)) {
    return candidateName;
  }

  // Search for any file ending with /candidateName
  // Sort paths to be deterministic
  const sortedPaths = existingNoteIds.slice().sort();
  for (const path of sortedPaths) {
    if (path.endsWith(`/${candidateName}`)) {
      return path;
    }
  }

  return null;
}
