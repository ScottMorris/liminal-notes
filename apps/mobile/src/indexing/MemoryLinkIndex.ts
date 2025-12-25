import { LinkIndex, NoteId, Link } from '@liminal-notes/core-shared/indexing/types';

export class MemoryLinkIndex implements LinkIndex {
  private outbound = new Map<NoteId, Link[]>();
  private backlinks = new Map<NoteId, Link[]>();

  async upsertLinks(source: NoteId, links: Link[]): Promise<void> {
    // Remove old backlinks first
    const oldLinks = this.outbound.get(source) || [];
    for (const link of oldLinks) {
      if (link.targetPath) {
        const bl = this.backlinks.get(link.targetPath) || [];
        this.backlinks.set(link.targetPath, bl.filter(l => l.source !== source));
      }
    }

    // Update outbound
    this.outbound.set(source, links);

    // Add new backlinks
    for (const link of links) {
      if (link.targetPath) {
        const bl = this.backlinks.get(link.targetPath) || [];
        bl.push(link);
        this.backlinks.set(link.targetPath, bl);
      }
    }
  }

  async removeSource(source: NoteId): Promise<void> {
    const links = this.outbound.get(source) || [];
    for (const link of links) {
      if (link.targetPath) {
        const bl = this.backlinks.get(link.targetPath) || [];
        this.backlinks.set(link.targetPath, bl.filter(l => l.source !== source));
      }
    }
    this.outbound.delete(source);
  }

  getOutbound(source: NoteId): Link[] {
    return this.outbound.get(source) || [];
  }

  getBacklinks(target: NoteId): Link[] {
    return this.backlinks.get(target) || [];
  }
}
