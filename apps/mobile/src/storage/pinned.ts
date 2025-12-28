import kv from './kv';
import { STORAGE_KEYS } from './keys';

export interface PinnedItem {
  id: string; // Path for now
  type: 'note' | 'folder';
  pinnedAt: number;
}

export const pinnedStorage = {
  async getAll(): Promise<PinnedItem[]> {
    const items = await kv.getJSON<PinnedItem[]>(STORAGE_KEYS.PINNED_ITEMS);
    return items || [];
  },

  async pin(id: string, type: 'note' | 'folder'): Promise<void> {
    const items = await this.getAll();
    if (items.some((i) => i.id === id)) return; // Already pinned

    const newItem: PinnedItem = {
      id,
      type,
      pinnedAt: Date.now(),
    };

    // Add to beginning
    await kv.setJSON(STORAGE_KEYS.PINNED_ITEMS, [newItem, ...items]);
  },

  async unpin(id: string): Promise<void> {
    const items = await this.getAll();
    const filtered = items.filter((i) => i.id !== id);
    await kv.setJSON(STORAGE_KEYS.PINNED_ITEMS, filtered);
  },

  async isPinned(id: string): Promise<boolean> {
    const items = await this.getAll();
    return items.some((i) => i.id === id);
  },

  async toggle(id: string, type: 'note' | 'folder'): Promise<boolean> {
      const isPinned = await this.isPinned(id);
      if (isPinned) {
          await this.unpin(id);
          return false;
      } else {
          await this.pin(id, type);
          return true;
      }
  }
};
