import Storage from 'expo-sqlite/kv-store';
import { KVStore } from './types';

export const kv: KVStore = {
  // Wrap to preserve Storage context; its methods reference `this`.
  getItem: (...args) => Storage.getItem(...args),
  setItem: (...args) => Storage.setItem(...args),
  removeItem: (...args) => Storage.removeItem(...args),

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
