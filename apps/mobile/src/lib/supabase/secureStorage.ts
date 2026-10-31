const CHUNK_SIZE = 2000;
const CHUNK_META_SUFFIX = '_chunk_meta';

interface ChunkMeta {
  count: number;
}

export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Creates a chunked storage adapter over expo-secure-store.
 * Chunking ensures values larger than Android's 2048-byte limit are partitioned
 * across indexed keys and reassembled transparently on retrieval.
 */
export function createChunkedSecureStorage(inMemoryFallback = false): StorageAdapter {
  let isNativeAvailable = !inMemoryFallback;

  // Check if expo-secure-store native module is available
  if (isNativeAvailable) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const SecureStore = require('expo-secure-store');
      if (typeof SecureStore.getItemAsync !== 'function') {
        isNativeAvailable = false;
      }
    } catch {
      isNativeAvailable = false;
    }
  }

  if (!isNativeAvailable) {
    return new MemoryStorageAdapter();
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SecureStore = require('expo-secure-store');

  return {
    async getItem(key: string): Promise<string | null> {
      try {
        const metaJson = await SecureStore.getItemAsync(`${key}${CHUNK_META_SUFFIX}`);
        if (metaJson) {
          const meta: ChunkMeta = JSON.parse(metaJson);
          const chunkPromises: Promise<string | null>[] = [];
          for (let i = 0; i < meta.count; i++) {
            chunkPromises.push(SecureStore.getItemAsync(`${key}_chunk_${i}`));
          }
          const chunks = await Promise.all(chunkPromises);
          if (chunks.some((c) => c === null)) {
            return null;
          }
          return chunks.join('');
        }

        return await SecureStore.getItemAsync(key);
      } catch {
        return null;
      }
    },

    async setItem(key: string, value: string): Promise<void> {
      try {
        if (value.length <= CHUNK_SIZE) {
          // Fits in a single key: cleanup previous chunk meta and chunks if any
          const metaJson = await SecureStore.getItemAsync(`${key}${CHUNK_META_SUFFIX}`);
          if (metaJson) {
            try {
              const meta: ChunkMeta = JSON.parse(metaJson);
              const deletions: Promise<void>[] = [];
              for (let i = 0; i < meta.count; i++) {
                deletions.push(SecureStore.deleteItemAsync(`${key}_chunk_${i}`));
              }
              deletions.push(SecureStore.deleteItemAsync(`${key}${CHUNK_META_SUFFIX}`));
              await Promise.all(deletions);
            } catch {
              // Ignore cleanup failure
            }
          }
          await SecureStore.setItemAsync(key, value);
        } else {
          // Exceeds chunk limit: partition into chunks
          const count = Math.ceil(value.length / CHUNK_SIZE);
          const chunkWrites: Promise<void>[] = [];

          for (let i = 0; i < count; i++) {
            const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            chunkWrites.push(SecureStore.setItemAsync(`${key}_chunk_${i}`, chunk));
          }

          // Write chunk metadata
          const meta: ChunkMeta = { count };
          chunkWrites.push(SecureStore.setItemAsync(`${key}${CHUNK_META_SUFFIX}`, JSON.stringify(meta)));

          // Delete raw unchunked key if it existed
          chunkWrites.push(SecureStore.deleteItemAsync(key).catch(() => {}));

          await Promise.all(chunkWrites);
        }
      } catch (err) {
        throw new Error(`Failed to store credentials securely in SecureStore: ${err instanceof Error ? err.message : String(err)}`);
      }
    },

    async removeItem(key: string): Promise<void> {
      try {
        const metaJson = await SecureStore.getItemAsync(`${key}${CHUNK_META_SUFFIX}`);
        const deletions: Promise<void>[] = [SecureStore.deleteItemAsync(key).catch(() => {})];

        if (metaJson) {
          try {
            const meta: ChunkMeta = JSON.parse(metaJson);
            for (let i = 0; i < meta.count; i++) {
              deletions.push(SecureStore.deleteItemAsync(`${key}_chunk_${i}`).catch(() => {}));
            }
            deletions.push(SecureStore.deleteItemAsync(`${key}${CHUNK_META_SUFFIX}`).catch(() => {}));
          } catch {
            // Ignore parse errors on deletion
          }
        }

        await Promise.all(deletions);
      } catch {
        // Non-fatal
      }
    },
  };
}

export const secureStorageAdapter = createChunkedSecureStorage();
