/**
 * Конфигурация Supabase из переменных окружения Vite (.env).
 * Без зависимостей — можно импортировать где угодно, не утяжеляя бандл.
 */
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

export const hasSupabaseKey = SUPABASE_ANON_KEY.length > 0;
export const hasSupabaseUrl = /^https:\/\/.+/.test(SUPABASE_URL);
/** Клиент можно создать, только когда заданы и URL проекта, и ключ. */
export const isSupabaseConfigured = hasSupabaseKey && hasSupabaseUrl;

/** Ключ для показа в интерфейсе: начало и конец, без полного значения. */
export function maskedKey(key = SUPABASE_ANON_KEY): string {
  if (!key) return '—';
  return key.length <= 18 ? key : `${key.slice(0, 15)}…${key.slice(-4)}`;
}
