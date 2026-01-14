import kv from './kv';
import { STORAGE_KEYS, vaultScopedKey } from './keys';

export interface PinnedItem {
  id: string; // Path for now
  type: 'note' | 'folder';
  pinnedAt: number;
}

export const pinnedStorage = {
  async getAll(vaultId: string | null): Promise<PinnedItem[]> {
    if (!vaultId) return [];
    const items = await kv.getJSON<PinnedItem[]>(vaultScopedKey(STORAGE_KEYS.PINNED_ITEMS, vaultId));
    return items || [];
  },

  async pin(vaultId: string | null, id: string, type: 'note' | 'folder'): Promise<void> {
    if (!vaultId) return;
    const key = vaultScopedKey(STORAGE_KEYS.PINNED_ITEMS, vaultId);
    const items = await this.getAll(vaultId);
    if (items.some((i) => i.id === id)) return; // Already pinned

    const newItem: PinnedItem = {
      id,
      type,
      pinnedAt: Date.now(),
    };

    // Add to beginning
    await kv.setJSON(key, [newItem, ...items]);
  },

  async unpin(vaultId: string | null, id: string): Promise<void> {
    if (!vaultId) return;
    const key = vaultScopedKey(STORAGE_KEYS.PINNED_ITEMS, vaultId);
    const items = await this.getAll(vaultId);
    const filtered = items.filter((i) => i.id !== id);
    await kv.setJSON(key, filtered);
  },

  async isPinned(vaultId: string | null, id: string): Promise<boolean> {
    if (!vaultId) return false;
    const items = await this.getAll(vaultId);
    return items.some((i) => i.id === id);
  },

  async toggle(vaultId: string | null, id: string, type: 'note' | 'folder'): Promise<boolean> {
      const isPinned = await this.isPinned(vaultId, id);
      if (isPinned) {
          await this.unpin(vaultId, id);
          return false;
      } else {
          await this.pin(vaultId, id, type);
          return true;
      }
  },

  async update(vaultId: string | null, oldId: string, newId: string): Promise<void> {
    if (!vaultId) return;
    const key = vaultScopedKey(STORAGE_KEYS.PINNED_ITEMS, vaultId);
    const items = await this.getAll(vaultId);
    const updated = items.map((i) => {
        if (i.id === oldId) {
            return { ...i, id: newId };
        }
        return i;
    });
    await kv.setJSON(key, updated);
  },

  async clear(vaultId: string | null): Promise<void> {
    if (!vaultId) return;
    await kv.removeItem(vaultScopedKey(STORAGE_KEYS.PINNED_ITEMS, vaultId));
  }
};
