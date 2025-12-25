import { NoteId, Link } from '../types';

export { NoteId, Link };

export interface NoteIndexEntry {
  id: NoteId;
  title: string;
  /** Content text or tokens. Optional as some implementations may differ. */
  content?: string;
  /** Modification time in milliseconds */
  mtimeMs?: number;
}

export interface SearchResult {
  id: NoteId;
  score: number;
  highlights?: { start: number; end: number }[];
}

export interface SearchIndex {
  upsert(entry: NoteIndexEntry): Promise<void> | void;
  remove(id: NoteId): Promise<void> | void;
  search(query: string, opts?: { limit?: number }): Promise<SearchResult[]>;
}

export interface LinkIndex {
  upsertLinks(source: NoteId, links: Link[]): Promise<void> | void;
  removeSource(source: NoteId): Promise<void> | void;
  getOutbound(source: NoteId): Promise<Link[]> | Link[];
  getBacklinks(target: NoteId): Promise<Link[]> | Link[];
}
