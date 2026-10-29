import type { KeyValueStore } from './types';

export class LocalStorageKeyValueStore implements KeyValueStore {
  getString(key: string): string | undefined {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = window.localStorage.getItem(key);
        return item === null ? undefined : item;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  set(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Storage quota exceeded or disabled
    }
  }

  delete(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Storage access error
    }
  }

  getAllKeys(): string[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storage = window.localStorage;
        if (typeof storage.key === 'function') {
          const keys: string[] = [];
          for (let i = 0; i < storage.length; i++) {
            const k = storage.key(i);
            if (k !== null) keys.push(k);
          }
          return keys;
        }
        return Object.keys(storage);
      }
      return [];
    } catch {
      return [];
    }
  }

  clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {
      // Storage access error
    }
  }
}
