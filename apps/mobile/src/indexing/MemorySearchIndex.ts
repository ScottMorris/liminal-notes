import { SearchIndex, NoteIndexEntry, SearchResult, NoteId } from '@liminal-notes/core-shared/indexing/types';

export class MemorySearchIndex implements SearchIndex {
  private index = new Map<NoteId, NoteIndexEntry>();

  async upsert(entry: NoteIndexEntry): Promise<void> {
    this.index.set(entry.id, entry);
  }

  async remove(id: NoteId): Promise<void> {
    this.index.delete(id);
  }

  async search(query: string, opts?: { limit?: number }): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const q = query.toLowerCase();

    for (const entry of this.index.values()) {
      // Basic implementation for verification
      const titleMatch = entry.title.toLowerCase().includes(q);
      const contentMatch = entry.content?.toLowerCase().includes(q);

      if (titleMatch || contentMatch) {
        results.push({
          id: entry.id,
          score: titleMatch ? 2 : 1
        });
      }
    }

    results.sort((a, b) => b.score - a.score);

    if (opts?.limit) {
      return results.slice(0, opts.limit);
    }
    return results;
  }
}
