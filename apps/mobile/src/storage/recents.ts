import kv from './kv';
import { STORAGE_KEYS } from './keys';

const MAX_RECENTS = 10;

export interface RecentItem {
  id: string; // Note path
  openedAt: number;
}

export const recentsStorage = {
  async getAll(): Promise<RecentItem[]> {
    const items = await kv.getJSON<RecentItem[]>(STORAGE_KEYS.RECENT_ITEMS);
    return items || [];
  },

  async add(id: string): Promise<void> {
    const items = await this.getAll();
    // Remove existing if present to move to top
    const filtered = items.filter((i) => i.id !== id);

    const newItem: RecentItem = {
      id,
      openedAt: Date.now(),
    };

    const newItems = [newItem, ...filtered].slice(0, MAX_RECENTS);
    await kv.setJSON(STORAGE_KEYS.RECENT_ITEMS, newItems);
  },

  async remove(id: string): Promise<void> {
      const items = await this.getAll();
      const filtered = items.filter((i) => i.id !== id);
      await kv.setJSON(STORAGE_KEYS.RECENT_ITEMS, filtered);
  }
};
