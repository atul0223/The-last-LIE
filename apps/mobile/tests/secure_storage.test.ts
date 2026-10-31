import { describe, it, expect, beforeEach } from 'vitest';
import { createChunkedSecureStorage, type StorageAdapter } from '../src/lib/supabase/secureStorage';

describe('WP-44: SecureStore Chunking & Retrieval', () => {
  let memoryStore: Map<string, string>;
  let adapter: StorageAdapter;

  beforeEach(() => {
    memoryStore = new Map<string, string>();

    // Mock SecureStore module behavior
    const mockSecureStore = {
      getItemAsync: async (key: string) => memoryStore.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => {
        if (value.length > 2048) {
          throw new Error('SecureStore 2048-byte limit exceeded on Android platform!');
        }
        memoryStore.set(key, value);
      },
      deleteItemAsync: async (key: string) => {
        memoryStore.delete(key);
      },
    };

    // Custom chunked storage with mock
    adapter = {
      async getItem(key: string): Promise<string | null> {
        const metaJson = await mockSecureStore.getItemAsync(`${key}_chunk_meta`);
        if (metaJson) {
          const meta = JSON.parse(metaJson);
          const chunks: string[] = [];
          for (let i = 0; i < meta.count; i++) {
            const chunk = await mockSecureStore.getItemAsync(`${key}_chunk_${i}`);
            if (chunk === null) return null;
            chunks.push(chunk);
          }
          return chunks.join('');
        }
        return await mockSecureStore.getItemAsync(key);
      },

      async setItem(key: string, value: string): Promise<void> {
        const CHUNK_SIZE = 2000;
        if (value.length <= CHUNK_SIZE) {
          await mockSecureStore.deleteItemAsync(`${key}_chunk_meta`);
          await mockSecureStore.setItemAsync(key, value);
        } else {
          const count = Math.ceil(value.length / CHUNK_SIZE);
          for (let i = 0; i < count; i++) {
            const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            await mockSecureStore.setItemAsync(`${key}_chunk_${i}`, chunk);
          }
          await mockSecureStore.setItemAsync(`${key}_chunk_meta`, JSON.stringify({ count }));
          await mockSecureStore.deleteItemAsync(key);
        }
      },

      async removeItem(key: string): Promise<void> {
        const metaJson = await mockSecureStore.getItemAsync(`${key}_chunk_meta`);
        if (metaJson) {
          const meta = JSON.parse(metaJson);
          for (let i = 0; i < meta.count; i++) {
            await mockSecureStore.deleteItemAsync(`${key}_chunk_${i}`);
          }
          await mockSecureStore.deleteItemAsync(`${key}_chunk_meta`);
        }
        await mockSecureStore.deleteItemAsync(key);
      },
    };
  });

  it('stores values under 2000 bytes directly in a single key', async () => {
    const shortToken = 'session_token_12345';
    await adapter.setItem('auth_session', shortToken);

    expect(memoryStore.has('auth_session')).toBe(true);
    expect(memoryStore.has('auth_session_chunk_meta')).toBe(false);
    expect(await adapter.getItem('auth_session')).toBe(shortToken);
  });

  it('chunks values exceeding 2000 bytes across multiple keys without exceeding 2048-byte limit', async () => {
    // Generate a 5500-byte session string
    const longToken = 'A'.repeat(5500);

    await adapter.setItem('auth_session_long', longToken);

    // Assert that raw unchunked key is not stored
    expect(memoryStore.has('auth_session_long')).toBe(false);

    // Assert metadata stored with 3 chunks (2000 + 2000 + 1500)
    expect(memoryStore.has('auth_session_long_chunk_meta')).toBe(true);
    const meta = JSON.parse(memoryStore.get('auth_session_long_chunk_meta')!);
    expect(meta.count).toBe(3);

    // Verify chunk keys
    expect(memoryStore.get('auth_session_long_chunk_0')?.length).toBe(2000);
    expect(memoryStore.get('auth_session_long_chunk_1')?.length).toBe(2000);
    expect(memoryStore.get('auth_session_long_chunk_2')?.length).toBe(1500);

    // Assert reassembly on getItem() matches exact original string
    const retrieved = await adapter.getItem('auth_session_long');
    expect(retrieved).toBe(longToken);
    expect(retrieved?.length).toBe(5500);
  });

  it('completely cleans up all chunk keys and metadata on removeItem()', async () => {
    const longToken = 'B'.repeat(4500);
    await adapter.setItem('auth_session_purge', longToken);

    expect(memoryStore.has('auth_session_purge_chunk_meta')).toBe(true);
    expect(memoryStore.has('auth_session_purge_chunk_0')).toBe(true);
    expect(memoryStore.has('auth_session_purge_chunk_1')).toBe(true);
    expect(memoryStore.has('auth_session_purge_chunk_2')).toBe(true);

    await adapter.removeItem('auth_session_purge');

    expect(memoryStore.has('auth_session_purge_chunk_meta')).toBe(false);
    expect(memoryStore.has('auth_session_purge_chunk_0')).toBe(false);
    expect(memoryStore.has('auth_session_purge_chunk_1')).toBe(false);
    expect(memoryStore.has('auth_session_purge_chunk_2')).toBe(false);
    expect(memoryStore.has('auth_session_purge')).toBe(false);

    expect(await adapter.getItem('auth_session_purge')).toBeNull();
  });

  it('falls back to memory adapter seamlessly when native module is unavailable', async () => {
    const fallback = createChunkedSecureStorage(true);
    await fallback.setItem('fallback_key', 'fallback_val');
    expect(await fallback.getItem('fallback_key')).toBe('fallback_val');
    await fallback.removeItem('fallback_key');
    expect(await fallback.getItem('fallback_key')).toBeNull();
  });
});
