import { clear, del, get, set } from 'idb-keyval';
import type { KeyValueStorage } from './storage.types';

export const storage: KeyValueStorage = {
  getItem: async (key) => (await get<string>(key)) ?? null,
  setItem: (key, value) => set(key, value),
  removeItem: (key) => del(key),
  clear: () => clear(),
};
