import type { KeyValueStore } from './types';

export class MemoryKeyValueStore implements KeyValueStore {
  private data: Map<string, string> = new Map();

  getString(key: string): string | undefined {
    return this.data.get(key);
  }

  set(key: string, value: string): void {
    this.data.set(key, value);
  }

  delete(key: string): void {
    this.data.delete(key);
  }

  getAllKeys(): string[] {
    return Array.from(this.data.keys());
  }

  clear(): void {
    this.data.clear();
  }
}
