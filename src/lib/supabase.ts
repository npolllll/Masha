import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabaseConfig';

let client: SupabaseClient | null = null;

/**
 * Ленивый клиент Supabase. Возвращает null, пока в .env не задан VITE_SUPABASE_URL.
 * Приложение по-прежнему хранит данные локально (IndexedDB) и не зависит от сети.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}
