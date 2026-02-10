import kv from './kv';
import { STORAGE_KEYS, vaultScopedKey } from './keys';

const MAX_RECENTS = 10;

export interface RecentItem {
  id: string; // Note path
  openedAt: number;
}

export const recentsStorage = {
  async getAll(vaultId: string | null): Promise<RecentItem[]> {
    if (!vaultId) return [];
    const items = await kv.getJSON<RecentItem[]>(vaultScopedKey(STORAGE_KEYS.RECENT_ITEMS, vaultId));
    return items || [];
  },

  async add(vaultId: string | null, id: string): Promise<void> {
    if (!vaultId) return;
    const key = vaultScopedKey(STORAGE_KEYS.RECENT_ITEMS, vaultId);
    const items = await this.getAll(vaultId);
    // Remove existing if present to move to top
    const filtered = items.filter((i) => i.id !== id);

    const newItem: RecentItem = {
      id,
      openedAt: Date.now(),
    };

    const newItems = [newItem, ...filtered].slice(0, MAX_RECENTS);
    await kv.setJSON(key, newItems);
  },

  async remove(vaultId: string | null, id: string): Promise<void> {
      if (!vaultId) return;
      const key = vaultScopedKey(STORAGE_KEYS.RECENT_ITEMS, vaultId);
      const items = await this.getAll(vaultId);
      const filtered = items.filter((i) => i.id !== id);
      await kv.setJSON(key, filtered);
  },

  async clear(vaultId: string | null): Promise<void> {
      if (!vaultId) return;
      await kv.removeItem(vaultScopedKey(STORAGE_KEYS.RECENT_ITEMS, vaultId));
  }
};
