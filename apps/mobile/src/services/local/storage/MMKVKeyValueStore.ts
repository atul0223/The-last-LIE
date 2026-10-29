import type { KeyValueStore } from './types';

export interface MMKVLike {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
  getAllKeys(): string[];
  clearAll?(): void;
}

export class MMKVKeyValueStore implements KeyValueStore {
  constructor(private mmkv: MMKVLike) {}

  getString(key: string): string | undefined {
    return this.mmkv.getString(key);
  }

  set(key: string, value: string): void {
    this.mmkv.set(key, value);
  }

  delete(key: string): void {
    this.mmkv.delete(key);
  }

  getAllKeys(): string[] {
    return this.mmkv.getAllKeys();
  }

  clear(): void {
    if (this.mmkv.clearAll) {
      this.mmkv.clearAll();
    } else {
      const keys = this.getAllKeys();
      for (const k of keys) {
        this.delete(k);
      }
    }
  }
}
