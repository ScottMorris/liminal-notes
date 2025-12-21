export type NoteId = string;
export type VaultId = string;

/**
 * Represents a raw wikilink match found in text.
 */
export interface WikiLinkMatch {
  from: number;
  to: number;
  targetRaw: string;
}

/**
 * Represents a semantic link between notes.
 */
export interface Link {
  /** The source note ID (path) containing the link */
  source: NoteId;
  /** The raw target text inside [[...]] */
  targetRaw: string;
  /** The resolved target note ID, if found */
  targetPath?: NoteId;
  /** The location of the link in the source text */
  range?: {
    from: number;
    to: number;
  };
}
