import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { secureStorageAdapter, type StorageAdapter } from './secureStorage';

let supabaseInstance: SupabaseClient | null = null;

export function isAuthEnabled(): boolean {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && url.trim().length > 0 && anonKey && anonKey.trim().length > 0);
}

export interface SupabaseClientOptions {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  storage?: StorageAdapter;
}

export function createSupabaseClient(options?: SupabaseClientOptions): SupabaseClient | null {
  const url = options?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = options?.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || url.trim().length === 0 || anonKey.trim().length === 0) {
    return null;
  }

  const storage = options?.storage ?? secureStorageAdapter;

  return createClient(url, anonKey, {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isAuthEnabled()) {
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();
  }

  return supabaseInstance;
}

export function resetSupabaseClient(): void {
  supabaseInstance = null;
}
