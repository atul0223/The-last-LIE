import type { KeyValueStore } from './types';
import { MemoryKeyValueStore } from './MemoryKeyValueStore';
import { LocalStorageKeyValueStore } from './LocalStorageKeyValueStore';
import { MMKVKeyValueStore } from './MMKVKeyValueStore';

let defaultStore: KeyValueStore | null = null;
let hasLoggedFallback = false;

export function resetStorageLogging(): void {
  hasLoggedFallback = false;
}

export function createDefaultStorage(): KeyValueStore {
  // 1. Attempt to instantiate MMKV (for physical devices / simulator builds with native binaries)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mmkvModule = require('react-native-mmkv');
    const MMKVClass = mmkvModule.MMKV;
    if (typeof MMKVClass === 'function') {
      const instance = new MMKVClass({ id: 'lastlie-storage' });
      if (typeof instance.getString === 'function') {
        return new MMKVKeyValueStore(instance);
      }
    }
  } catch {
    // Native MMKV unavailable (Web, Expo Go, Node test environment)
  }

  // 2. Fallback: browser localStorage on web
  if (typeof window !== 'undefined' && window.localStorage) {
    if (!hasLoggedFallback) {
      console.warn(
        '[Storage] MMKV is unavailable in this environment, falling back to LocalStorageKeyValueStore.',
      );
      hasLoggedFallback = true;
    }
    return new LocalStorageKeyValueStore();
  }

  // 3. Fallback: in-memory store for Node / headless tests
  if (!hasLoggedFallback) {
    console.warn(
      '[Storage] MMKV is unavailable in this environment, falling back to MemoryKeyValueStore.',
    );
    hasLoggedFallback = true;
  }
  return new MemoryKeyValueStore();
}

export function getStorage(override?: KeyValueStore): KeyValueStore {
  if (override) return override;
  if (!defaultStore) {
    defaultStore = createDefaultStorage();
  }
  return defaultStore;
}

export function setStorage(store: KeyValueStore | null): void {
  defaultStore = store;
}
