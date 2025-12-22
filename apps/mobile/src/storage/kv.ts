import Storage from 'expo-sqlite/kv-store';

export const kv = {
  getItem: Storage.getItem,
  setItem: Storage.setItem,
  removeItem: Storage.removeItem,

  // Type-safe JSON helpers
  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await Storage.getItem(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async setJSON(key: string, value: unknown): Promise<void> {
    await Storage.setItem(key, JSON.stringify(value));
  },
};

export default kv;
